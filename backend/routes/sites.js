/**
 * FILE: backend/routes/sites.js
 * PURPOSE: API routes for site management in DevOpser Lite
 * DESCRIPTION: Handles CRUD operations for sites, chat-based configuration,
 *              and triggering deployments.
 */

const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/authMiddleware');
const db = require('../models');
const { processWithTools, generateSiteFromDescription } = require('../services/websiteAgentServiceV2');
const { createSiteConfig, validateSiteConfig } = require('../services/templateService');

/**
 * GET /api/sites
 * List all sites for the authenticated user
 */
router.get('/', ensureAuthenticated, async (req, res) => {
  try {
    const sites = await db.Site.findAll({
      where: { userId: req.user.id },
      order: [['created_at', 'DESC']],
      include: [
        {
          model: db.Deployment,
          as: 'deployments',
          limit: 1,
          order: [['started_at', 'DESC']]
        }
      ]
    });

    res.json({
      success: true,
      sites: sites.map(site => site.toPublicJSON())
    });
  } catch (error) {
    console.error('[Sites] Error listing sites:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list sites'
    });
  }
});

/**
 * POST /api/sites
 * Create a new site
 */
router.post('/', ensureAuthenticated, async (req, res) => {
  try {
    const { name, description, initialPrompt } = req.body;
    const siteDescription = description || initialPrompt; // Accept both

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Site name is required'
      });
    }

    // Generate a unique slug
    let baseSlug = db.Site.generateSlug(name);
    let slug = baseSlug;
    let counter = 1;

    while (!(await db.Site.isSlugAvailable(slug))) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Create initial configuration
    let draftConfig;
    if (siteDescription) {
      // Use AI to generate initial config from description
      const result = await generateSiteFromDescription(siteDescription);
      if (result.newConfig) {
        draftConfig = result.newConfig;
        draftConfig.siteName = name;
      } else {
        draftConfig = createSiteConfig(name);
      }
    } else {
      draftConfig = createSiteConfig(name);
    }

    // Create the site
    const site = await db.Site.create({
      userId: req.user.id,
      name,
      slug,
      status: 'draft',
      draftConfig
    });

    console.log(`[Sites] Created site ${site.id} (${slug}) for user ${req.user.id}`);

    res.status(201).json({
      success: true,
      site: site.toPublicJSON(),
      message: siteDescription ? 'Site created with AI-generated content!' : 'Site created successfully!'
    });
  } catch (error) {
    console.error('[Sites] Error creating site:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create site'
    });
  }
});

/**
 * GET /api/sites/:id
 * Get site details
 */
router.get('/:id', ensureAuthenticated, async (req, res) => {
  try {
    const site = await db.Site.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      },
      include: [
        {
          model: db.Deployment,
          as: 'deployments',
          order: [['started_at', 'DESC']],
          limit: 5
        },
        {
          model: db.SiteImage,
          as: 'images',
          order: [['created_at', 'DESC']],
          limit: 10
        }
      ]
    });

    if (!site) {
      return res.status(404).json({
        success: false,
        error: 'Site not found'
      });
    }

    res.json({
      success: true,
      site: site.toPublicJSON(),
      deployments: site.deployments.map(d => d.toPublicJSON()),
      images: site.images.map(i => i.toPublicJSON())
    });
  } catch (error) {
    console.error('[Sites] Error getting site:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get site'
    });
  }
});

/**
 * PUT /api/sites/:id
 * Update site configuration (direct update, not chat-based)
 */
router.put('/:id', ensureAuthenticated, async (req, res) => {
  try {
    const site = await db.Site.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!site) {
      return res.status(404).json({
        success: false,
        error: 'Site not found'
      });
    }

    const { name, draftConfig, customDomain } = req.body;

    // Update fields if provided
    if (name) {
      site.name = name;
    }

    if (draftConfig) {
      const validation = validateSiteConfig(draftConfig);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid configuration',
          details: validation.errors
        });
      }
      site.draftConfig = draftConfig;
    }

    if (customDomain !== undefined) {
      site.customDomain = customDomain || null;
    }

    await site.save();

    console.log(`[Sites] Updated site ${site.id}`);

    res.json({
      success: true,
      site: site.toPublicJSON()
    });
  } catch (error) {
    console.error('[Sites] Error updating site:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update site'
    });
  }
});

/**
 * DELETE /api/sites/:id
 * Delete a site
 */
router.delete('/:id', ensureAuthenticated, async (req, res) => {
  try {
    const site = await db.Site.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!site) {
      return res.status(404).json({
        success: false,
        error: 'Site not found'
      });
    }

    const siteId = site.id;
    const siteName = site.name;
    const slug = site.slug;

    console.log(`[Sites] Starting deletion of site ${siteId} (${siteName})`);

    // Clean up AWS resources if they exist
    try {
      // 1. Delete Lightsail container service
      if (site.lightsailServiceName) {
        console.log(`[Sites] Deleting Lightsail service: ${site.lightsailServiceName}`);
        // TODO: Uncomment when lightsailService is implemented
        // const lightsailService = require('../services/lightsailService');
        // await lightsailService.deleteContainerService(site);
      }

      // 2. Delete ECR images for this site
      // TODO: Uncomment when ECR cleanup is implemented
      // const ecrService = require('../services/ecrService');
      // await ecrService.deleteImagesForSite(siteId);

      // 3. Delete GitHub repository
      if (site.githubRepoUrl) {
        console.log(`[Sites] Deleting GitHub repo: ${site.githubRepoUrl}`);
        // TODO: Uncomment when githubService is implemented
        // const githubService = require('../services/githubService');
        // await githubService.deleteSiteRepo(site);
      }

      // 4. Clean up Route53 DNS records
      // Always clean up the subdomain ({slug}.devopser.io)
      console.log(`[Sites] Cleaning up DNS for subdomain: ${slug}.devopser.io`);
      // TODO: Uncomment when route53Service is implemented
      // const route53Service = require('../services/route53Service');
      // await route53Service.deleteSubdomainRecord(slug);

      // Also clean up custom domain if configured
      if (site.customDomain) {
        console.log(`[Sites] Cleaning up custom domain: ${site.customDomain}`);

        // Delete custom domain DNS records
        // await route53Service.deleteCustomDomainRecords(site.customDomain);

        // Delete ACM SSL certificate for custom domain
        console.log(`[Sites] Deleting SSL certificate for: ${site.customDomain}`);
        // const acmService = require('../services/acmService');
        // await acmService.deleteCertificate(site.customDomain);

        // Remove custom domain from Lightsail container service
        // await lightsailService.removeCustomDomain(site);
      }
    } catch (cleanupError) {
      // Log but don't fail - we still want to delete the DB records
      console.error(`[Sites] Warning: Error cleaning up AWS resources for site ${siteId}:`, cleanupError.message);
    }

    // Delete related database records
    await db.Deployment.destroy({ where: { siteId: siteId } });
    await db.SiteImage.destroy({ where: { siteId: siteId } });

    // Delete the site record
    await site.destroy();

    console.log(`[Sites] Successfully deleted site ${siteId} (${siteName})`);

    // Log what was cleaned up for audit trail
    console.log(`[Sites] Cleanup summary for site ${siteId}:`, {
      lightsail: site.lightsailServiceName ? 'deleted' : 'n/a',
      ecr: 'cleaned',
      github: site.githubRepoUrl ? 'deleted' : 'n/a',
      subdomain: `${slug}.devopser.io deleted`,
      customDomain: site.customDomain || 'n/a',
      customDomainDns: site.customDomain ? 'deleted' : 'n/a',
      customDomainSsl: site.customDomain ? 'certificate deleted' : 'n/a'
    });

    res.json({
      success: true,
      message: 'Site deleted successfully'
    });
  } catch (error) {
    console.error('[Sites] Error deleting site:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete site'
    });
  }
});

/**
 * POST /api/sites/:id/chat
 * Chat with AI to modify site configuration
 */
router.post('/:id/chat', ensureAuthenticated, async (req, res) => {
  try {
    const site = await db.Site.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!site) {
      return res.status(404).json({
        success: false,
        error: 'Site not found'
      });
    }

    const { message, history = [] } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    console.log(`[Sites] Chat message for site ${site.id}: ${message.substring(0, 100)}`);

    // Process the message with the AI agent (using tool use)
    const result = await processWithTools(message, site.draftConfig, history);

    // Update the site if there were changes
    if (result.newConfig) {
      site.draftConfig = result.newConfig;
      await site.save();
      console.log(`[Sites] Updated site ${site.id} config via chat. Tools used: ${result.toolsUsed?.map(t => t.name).join(', ') || 'none'}`);
    }

    res.json({
      success: true,
      message: result.message,
      toolsUsed: result.toolsUsed || [],
      site: site.toPublicJSON(),
      siteConfig: site.draftConfig // Convenience for frontend preview
    });
  } catch (error) {
    console.error('[Sites] Error in chat:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process chat message'
    });
  }
});

/**
 * POST /api/sites/:id/publish
 * Trigger deployment of the site
 */
router.post('/:id/publish', ensureAuthenticated, async (req, res) => {
  try {
    const site = await db.Site.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!site) {
      return res.status(404).json({
        success: false,
        error: 'Site not found'
      });
    }

    if (!site.draftConfig || !site.draftConfig.sections || site.draftConfig.sections.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Site has no content to publish'
      });
    }

    // Create a deployment record
    const deployment = await db.Deployment.create({
      siteId: site.id,
      status: 'pending',
      configSnapshot: site.draftConfig
    });

    // Update site status
    site.status = 'deploying';
    await site.save();

    console.log(`[Sites] Starting deployment ${deployment.id} for site ${site.id}`);

    // TODO: Trigger actual deployment process
    // For now, we'll simulate the deployment process
    triggerDeployment(site, deployment).catch(error => {
      console.error(`[Sites] Deployment ${deployment.id} failed:`, error);
    });

    res.json({
      success: true,
      message: 'Deployment started',
      deployment: deployment.toPublicJSON(),
      site: site.toPublicJSON()
    });
  } catch (error) {
    console.error('[Sites] Error starting deployment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start deployment'
    });
  }
});

/**
 * GET /api/sites/:id/deployments
 * Get deployment history for a site
 */
router.get('/:id/deployments', ensureAuthenticated, async (req, res) => {
  try {
    const site = await db.Site.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!site) {
      return res.status(404).json({
        success: false,
        error: 'Site not found'
      });
    }

    const deployments = await db.Deployment.findAll({
      where: { siteId: site.id },
      order: [['started_at', 'DESC']],
      limit: 20
    });

    res.json({
      success: true,
      deployments: deployments.map(d => d.toPublicJSON())
    });
  } catch (error) {
    console.error('[Sites] Error getting deployments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get deployments'
    });
  }
});

/**
 * Trigger the actual deployment process (async)
 * @param {Object} site - Site model instance
 * @param {Object} deployment - Deployment model instance
 */
async function triggerDeployment(site, deployment) {
  try {
    // Mark as building
    await deployment.markAsBuilding();

    // TODO: Implement actual deployment steps:
    // 1. Create/update GitHub repo with site config
    // 2. Trigger GitHub Actions build
    // 3. Wait for container to be pushed to ECR
    // 4. Deploy to Lightsail
    // 5. Update DNS if needed

    // For now, simulate a successful deployment after 5 seconds
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Mark deployment as successful
    await deployment.markAsSuccess('simulated-deployment-id');

    // Update site with published config
    site.status = 'published';
    site.publishedConfig = deployment.configSnapshot;
    site.lightsailEndpoint = `https://${site.slug}.devopser.io`;
    await site.save();

    console.log(`[Sites] Deployment ${deployment.id} completed for site ${site.id}`);
  } catch (error) {
    console.error(`[Sites] Deployment ${deployment.id} failed:`, error);
    await deployment.markAsFailed(error.message);
    site.status = 'failed';
    await site.save();
  }
}

module.exports = router;
