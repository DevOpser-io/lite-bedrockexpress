/**
 * FILE: backend/services/websiteAgentTools.js
 * PURPOSE: Tool definitions for the website builder AI agent
 * DESCRIPTION: Defines tools that Claude can use to modify website configurations.
 *              Uses Claude's native tool use feature via Bedrock.
 */

const { SECTION_SCHEMAS, THEME_PRESETS, AVAILABLE_ICONS } = require('../config/sectionSchemas');
const { v4: uuidv4 } = require('uuid');

/**
 * Tool definitions for Claude
 * These follow the Anthropic tool use schema
 */
const WEBSITE_TOOLS = [
  {
    name: 'update_theme',
    description: 'Update the website theme colors and font. Use this when the user wants to change colors, fonts, or apply a theme preset.',
    input_schema: {
      type: 'object',
      properties: {
        primaryColor: {
          type: 'string',
          description: 'Primary brand color in hex format (e.g., "#3B82F6")'
        },
        secondaryColor: {
          type: 'string',
          description: 'Secondary accent color in hex format (e.g., "#10B981")'
        },
        backgroundColor: {
          type: 'string',
          description: 'Background color in hex format (e.g., "#FFFFFF")'
        },
        textColor: {
          type: 'string',
          description: 'Main text color in hex format (e.g., "#1F2937")'
        },
        fontFamily: {
          type: 'string',
          description: 'Font family name (e.g., "Inter", "Roboto", "Poppins")'
        },
        preset: {
          type: 'string',
          enum: Object.keys(THEME_PRESETS),
          description: 'Apply a preset theme: ' + Object.entries(THEME_PRESETS).map(([k, v]) => `${k} (${v.name})`).join(', ')
        }
      }
    }
  },
  {
    name: 'add_section',
    description: 'Add a new section to the website. Available section types: hero (main banner), features (feature grid), about (about text), testimonials (customer quotes), pricing (pricing tiers), contact (contact form), footer (site footer).',
    input_schema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: Object.keys(SECTION_SCHEMAS),
          description: 'Type of section to add'
        },
        position: {
          type: 'integer',
          description: 'Position to insert the section (0 = first, omit for end)'
        },
        content: {
          type: 'object',
          description: 'Section content. Structure depends on section type.'
        }
      },
      required: ['type']
    }
  },
  {
    name: 'update_section',
    description: 'Update an existing section\'s content. Use this to change headlines, text, features, pricing, etc.',
    input_schema: {
      type: 'object',
      properties: {
        sectionId: {
          type: 'string',
          description: 'ID of the section to update (e.g., "hero-1", "features-1")'
        },
        sectionType: {
          type: 'string',
          enum: Object.keys(SECTION_SCHEMAS),
          description: 'Type of section (helps identify if sectionId is ambiguous)'
        },
        content: {
          type: 'object',
          description: 'Partial content update - only include fields to change'
        },
        visible: {
          type: 'boolean',
          description: 'Set to false to hide the section, true to show'
        }
      },
      required: ['content']
    }
  },
  {
    name: 'remove_section',
    description: 'Remove a section from the website.',
    input_schema: {
      type: 'object',
      properties: {
        sectionId: {
          type: 'string',
          description: 'ID of the section to remove'
        },
        sectionType: {
          type: 'string',
          enum: Object.keys(SECTION_SCHEMAS),
          description: 'Type of section to remove (if sectionId not known)'
        }
      }
    }
  },
  {
    name: 'reorder_sections',
    description: 'Change the order of sections on the page.',
    input_schema: {
      type: 'object',
      properties: {
        newOrder: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of section IDs in the desired order'
        },
        moveSection: {
          type: 'object',
          properties: {
            sectionId: { type: 'string' },
            direction: { type: 'string', enum: ['up', 'down', 'first', 'last'] }
          },
          description: 'Alternative: move a single section up/down/first/last'
        }
      }
    }
  },
  {
    name: 'create_full_site',
    description: 'Create a complete website from scratch with multiple sections. Use this for initial site creation when the user describes a new website.',
    input_schema: {
      type: 'object',
      properties: {
        siteName: {
          type: 'string',
          description: 'Name of the website'
        },
        theme: {
          type: 'object',
          properties: {
            primaryColor: { type: 'string' },
            secondaryColor: { type: 'string' },
            backgroundColor: { type: 'string' },
            textColor: { type: 'string' },
            fontFamily: { type: 'string' }
          },
          description: 'Theme configuration'
        },
        sections: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: Object.keys(SECTION_SCHEMAS) },
              content: { type: 'object' }
            },
            required: ['type']
          },
          description: 'Array of sections to create'
        }
      },
      required: ['siteName', 'sections']
    }
  }
];

/**
 * Execute a tool call and return the result
 * @param {string} toolName - Name of the tool to execute
 * @param {Object} toolInput - Input parameters for the tool
 * @param {Object} currentConfig - Current site configuration
 * @returns {Object} - { success, config, message }
 */
function executeTool(toolName, toolInput, currentConfig) {
  // Clone config to avoid mutation
  let config = currentConfig ? JSON.parse(JSON.stringify(currentConfig)) : {
    siteName: 'My Website',
    theme: { ...THEME_PRESETS.blue },
    sections: []
  };

  try {
    switch (toolName) {
      case 'update_theme':
        return executeUpdateTheme(config, toolInput);

      case 'add_section':
        return executeAddSection(config, toolInput);

      case 'update_section':
        return executeUpdateSection(config, toolInput);

      case 'remove_section':
        return executeRemoveSection(config, toolInput);

      case 'reorder_sections':
        return executeReorderSections(config, toolInput);

      case 'create_full_site':
        return executeCreateFullSite(toolInput);

      default:
        return {
          success: false,
          config,
          message: `Unknown tool: ${toolName}`
        };
    }
  } catch (error) {
    console.error(`[Tools] Error executing ${toolName}:`, error);
    return {
      success: false,
      config,
      message: `Error: ${error.message}`
    };
  }
}

/**
 * Update theme colors/fonts
 */
function executeUpdateTheme(config, input) {
  // Apply preset if specified
  if (input.preset && THEME_PRESETS[input.preset]) {
    config.theme = { ...config.theme, ...THEME_PRESETS[input.preset] };
  }

  // Apply individual overrides
  if (input.primaryColor) config.theme.primaryColor = input.primaryColor;
  if (input.secondaryColor) config.theme.secondaryColor = input.secondaryColor;
  if (input.backgroundColor) config.theme.backgroundColor = input.backgroundColor;
  if (input.textColor) config.theme.textColor = input.textColor;
  if (input.fontFamily) config.theme.fontFamily = input.fontFamily;

  return {
    success: true,
    config,
    message: 'Theme updated successfully'
  };
}

/**
 * Add a new section
 */
function executeAddSection(config, input) {
  const schema = SECTION_SCHEMAS[input.type];
  if (!schema) {
    return {
      success: false,
      config,
      message: `Unknown section type: ${input.type}`
    };
  }

  const newSection = {
    id: `${input.type}-${uuidv4().slice(0, 8)}`,
    type: input.type,
    order: 0,
    visible: true,
    content: {
      ...schema.defaultContent,
      ...(input.content || {})
    }
  };

  // Determine position
  const position = input.position !== undefined ? input.position : config.sections.length;

  // Insert at position
  config.sections.splice(position, 0, newSection);

  // Update order of all sections
  config.sections.forEach((s, idx) => s.order = idx);

  return {
    success: true,
    config,
    message: `Added ${schema.displayName} section`
  };
}

/**
 * Update an existing section
 */
function executeUpdateSection(config, input) {
  // Find section by ID or type
  let sectionIndex = -1;

  if (input.sectionId) {
    sectionIndex = config.sections.findIndex(s => s.id === input.sectionId);
  }

  if (sectionIndex === -1 && input.sectionType) {
    sectionIndex = config.sections.findIndex(s => s.type === input.sectionType);
  }

  if (sectionIndex === -1) {
    // Try to find by type from the content hints
    const possibleTypes = Object.keys(SECTION_SCHEMAS);
    for (const type of possibleTypes) {
      const idx = config.sections.findIndex(s => s.type === type);
      if (idx !== -1) {
        // Check if content keys match this section type
        const contentKeys = Object.keys(input.content || {});
        const schemaKeys = Object.keys(SECTION_SCHEMAS[type].schema || {});
        if (contentKeys.some(k => schemaKeys.includes(k))) {
          sectionIndex = idx;
          break;
        }
      }
    }
  }

  if (sectionIndex === -1) {
    return {
      success: false,
      config,
      message: 'Section not found. Available sections: ' + config.sections.map(s => `${s.id} (${s.type})`).join(', ')
    };
  }

  const section = config.sections[sectionIndex];

  // Update content (deep merge)
  if (input.content) {
    section.content = deepMerge(section.content, input.content);
  }

  // Update visibility
  if (input.visible !== undefined) {
    section.visible = input.visible;
  }

  return {
    success: true,
    config,
    message: `Updated ${section.type} section`
  };
}

/**
 * Remove a section
 */
function executeRemoveSection(config, input) {
  let sectionIndex = -1;

  if (input.sectionId) {
    sectionIndex = config.sections.findIndex(s => s.id === input.sectionId);
  }

  if (sectionIndex === -1 && input.sectionType) {
    sectionIndex = config.sections.findIndex(s => s.type === input.sectionType);
  }

  if (sectionIndex === -1) {
    return {
      success: false,
      config,
      message: 'Section not found'
    };
  }

  const removed = config.sections.splice(sectionIndex, 1)[0];

  // Update order of remaining sections
  config.sections.forEach((s, idx) => s.order = idx);

  return {
    success: true,
    config,
    message: `Removed ${removed.type} section`
  };
}

/**
 * Reorder sections
 */
function executeReorderSections(config, input) {
  if (input.newOrder && Array.isArray(input.newOrder)) {
    // Full reorder
    const sectionMap = new Map(config.sections.map(s => [s.id, s]));
    const newSections = [];

    for (const id of input.newOrder) {
      if (sectionMap.has(id)) {
        newSections.push(sectionMap.get(id));
        sectionMap.delete(id);
      }
    }

    // Add any sections not in the new order at the end
    for (const section of sectionMap.values()) {
      newSections.push(section);
    }

    config.sections = newSections;
    config.sections.forEach((s, idx) => s.order = idx);
  } else if (input.moveSection) {
    // Move single section
    const { sectionId, direction } = input.moveSection;
    const idx = config.sections.findIndex(s => s.id === sectionId);

    if (idx !== -1) {
      const section = config.sections.splice(idx, 1)[0];
      let newIdx;

      switch (direction) {
        case 'up':
          newIdx = Math.max(0, idx - 1);
          break;
        case 'down':
          newIdx = Math.min(config.sections.length, idx + 1);
          break;
        case 'first':
          newIdx = 0;
          break;
        case 'last':
          newIdx = config.sections.length;
          break;
        default:
          newIdx = idx;
      }

      config.sections.splice(newIdx, 0, section);
      config.sections.forEach((s, i) => s.order = i);
    }
  }

  return {
    success: true,
    config,
    message: 'Sections reordered'
  };
}

/**
 * Create a complete site from scratch
 */
function executeCreateFullSite(input) {
  const config = {
    siteName: input.siteName || 'My Website',
    theme: {
      ...THEME_PRESETS.blue,
      ...(input.theme || {})
    },
    sections: []
  };

  // Add each section
  (input.sections || []).forEach((sectionInput, idx) => {
    const schema = SECTION_SCHEMAS[sectionInput.type];
    if (schema) {
      config.sections.push({
        id: `${sectionInput.type}-${uuidv4().slice(0, 8)}`,
        type: sectionInput.type,
        order: idx,
        visible: true,
        content: {
          ...schema.defaultContent,
          ...(sectionInput.content || {})
        }
      });
    }
  });

  return {
    success: true,
    config,
    message: `Created website "${config.siteName}" with ${config.sections.length} sections`
  };
}

/**
 * Deep merge two objects
 */
function deepMerge(target, source) {
  const result = { ...target };

  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }

  return result;
}

/**
 * Get the system prompt for the agent
 */
function getAgentSystemPrompt(currentConfig) {
  let prompt = `You are a website builder AI assistant for DevOpser Lite.
You help users create and modify websites by using the available tools.

IMPORTANT: You MUST use tools to make changes. Do not just describe what you would do - actually call the tools.

Current site configuration:
${currentConfig ? JSON.stringify(currentConfig, null, 2) : 'No site created yet'}

AVAILABLE SECTION TYPES:
${Object.entries(SECTION_SCHEMAS).map(([type, schema]) =>
  `- ${type}: ${schema.description}`
).join('\n')}

AVAILABLE THEME PRESETS:
${Object.entries(THEME_PRESETS).map(([key, preset]) =>
  `- ${key}: ${preset.name} (${preset.primaryColor})`
).join('\n')}

AVAILABLE ICONS (for features):
${AVAILABLE_ICONS.join(', ')}

GUIDELINES:
1. For new websites, use create_full_site with all sections at once
2. For changes to existing sites, use the specific update tools
3. When updating content, only include the fields that need to change
4. Always be creative with content - write compelling headlines and descriptions
5. After making changes, briefly confirm what you did

EXAMPLES OF GOOD TOOL USE:
- User says "make a landing page for a coffee shop" -> use create_full_site with hero, features, about, contact, footer
- User says "change the colors to purple" -> use update_theme with primaryColor and secondaryColor
- User says "make the headline more exciting" -> use update_section to change the hero headline
- User says "add a pricing section" -> use add_section with type "pricing" and relevant content
`;

  return prompt;
}

module.exports = {
  WEBSITE_TOOLS,
  executeTool,
  getAgentSystemPrompt
};
