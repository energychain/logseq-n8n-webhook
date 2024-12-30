// src/index.ts
import '@logseq/libs'
import { SettingSchemaDesc } from '@logseq/libs/dist/LSPlugin.user'

const SETTINGS: SettingSchemaDesc[] = [
  {
    key: "webhookUrl",
    type: "string",
    default: "",
    title: "N8N Webhook URL",
    description: "Enter your N8N webhook URL"
  }
];

function formatArrayAsMarkdownList(arr: any[], indent: string = ''): string {
  return arr.map(item => {
    if (typeof item === 'object' && item !== null) {
      return `${indent}- ${formatObjectAsMarkdown(item, `${indent}  `)}`
    }
    return `${indent}- ${String(item)}`
  }).join('\n')
}

function formatObjectAsMarkdown(obj: Record<string, any>, indent: string = ''): string {
  if (Array.isArray(obj)) {
    return formatArrayAsMarkdownList(obj, indent)
  }

  const lines: string[] = []
  
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      continue
    }

    if (Array.isArray(value)) {
      lines.push(`${indent}${key}:\n${formatArrayAsMarkdownList(value, `${indent}  `)}`)
    } else if (typeof value === 'object') {
      lines.push(`${indent}${key}:\n${formatObjectAsMarkdown(value, `${indent}  `)}`)
    } else {
      lines.push(`${indent}${key}: ${String(value)}`)
    }
  }

  return lines.join('\n')
}

function processResult(result: any): string {
  // Handle string result
  if (typeof result === 'string') {
    return result
  }
  
  // Handle array result
  if (Array.isArray(result)) {
    return formatArrayAsMarkdownList(result)
  }
  
  // Handle object result
  if (typeof result === 'object' && result !== null) {
    // Check for special fields in order of priority
    if ('markdown' in result) {
      return result.markdown
    }
    if ('body' in result) {
      return typeof result.body === 'string' ? result.body : formatObjectAsMarkdown(result.body)
    }
    if ('text' in result) {
      return result.text
    }
    
    // Format as key-value pairs with special handling for arrays
    return formatObjectAsMarkdown(result)
  }
  
  // Fallback for other types
  return String(result)
}

function createModel() {
  return {
    async triggerWebhook() {
      const block = await logseq.Editor.getCurrentBlock()
      if (!block) return

      try {
        const webhookUrl = logseq.settings?.webhookUrl

        if (!webhookUrl) {
          await logseq.UI.showMsg('Please configure the N8N webhook URL in plugin settings', 'error')
          return
        }

        const payload = {
          logseq: block.content
        }

        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const result = await response.json()

        if (result) {
          const formattedContent = processResult(result)
          // Ensure the content starts with a list marker
          const contentToInsert = formattedContent.startsWith('-') ? 
            formattedContent : 
            `- N8N Response:\n${formattedContent.split('\n').map(line => `  ${line}`).join('\n')}`
          
          await logseq.Editor.insertBlock(
            block.uuid, 
            contentToInsert,
            { sibling: false }
          )
        }
      } catch (error) {
        console.error('Error calling N8N webhook:', error)
        await logseq.UI.showMsg(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
      }
    }
  }
}

function main() {
  // Register settings
  logseq.useSettingsSchema(SETTINGS)

  const model = createModel()
  logseq.provideModel(model)

  // Register slash command
  logseq.Editor.registerSlashCommand(
    'n8n',
    () => model.triggerWebhook()
  )

  console.log('N8N Webhook Plugin initialized with settings support')
}

// bootstrap
logseq.ready(main).catch(console.error)