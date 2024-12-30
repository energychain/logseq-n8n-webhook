// src/settings.ts
import { SettingSchemaDesc } from '@logseq/libs/dist/LSPlugin';

export const settings: SettingSchemaDesc[] = [
  {
    key: "webhookUrl",
    type: "string",
    default: "",
    title: "N8N Webhook URL",
    description: "Enter your N8N webhook URL"
  }
];