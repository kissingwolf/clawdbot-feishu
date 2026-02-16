import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import type * as Lark from "@larksuiteoapi/node-sdk";
import { FeishuChatSchema, type FeishuChatParams } from "./chat-schema.js";
import { hasFeishuToolEnabledForAnyAccount, withFeishuToolClient } from "./tools-common/tool-exec.js";

function json(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    details: data,
  };
}

async function getAnnouncement(client: Lark.Client, chatId: string) {
  try {
    const res = await client.im.chatAnnouncement.get({
      path: { chat_id: chatId },
    });
    if (res.code !== 0) throw new Error(res.msg);
    return res.data;
  } catch (err: any) {
    if (err?.response?.data?.code === 232097 || 
        err?.message?.includes("docx") || 
        err?.message?.includes("232097")) {
      const infoRes = await client.docx.chatAnnouncement.get({
        path: { chat_id: chatId },
      });
      if (infoRes.code !== 0) throw new Error(infoRes.msg);
      
      const blocksRes = await client.docx.chatAnnouncementBlock.list({
        path: { chat_id: chatId },
      });
      
      return {
        announcement_type: "docx",
        info: infoRes.data,
        blocks: blocksRes.data?.items,
      };
    }
    throw err;
  }
}

export function registerFeishuChatTools(api: OpenClawPluginApi) {
  if (!api.config) {
    api.logger.debug?.("feishu_chat: No config available, skipping chat tools");
    return;
  }

  if (!hasFeishuToolEnabledForAnyAccount(api.config)) {
    api.logger.debug?.("feishu_chat: No Feishu accounts configured, skipping chat tools");
    return;
  }

  api.registerTool(
    {
      name: "feishu_chat",
      label: "Feishu Chat",
      description: "Feishu chat operations. Actions: get_announcement, get_announcement_info. Use to read group announcements.",
      parameters: FeishuChatSchema,
      async execute(_toolCallId, params) {
        const p = params as FeishuChatParams;
        try {
          return await withFeishuToolClient({
            api,
            toolName: "feishu_chat",
            requiredTool: "chat",
            run: async ({ client }) => {
              switch (p.action) {
                case "get_announcement_info":
                case "get_announcement":
                  return json(await getAnnouncement(client, p.chat_id));
                default:
                  return json({ error: `Unknown action: ${(p as any).action}` });
              }
            },
          });
        } catch (err) {
          return json({ error: err instanceof Error ? err.message : String(err) });
        }
      },
    },
    { name: "feishu_chat" },
  );

  api.logger.debug?.("feishu_chat: Registered feishu_chat tool");
}