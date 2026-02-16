import { Type, type Static } from "@sinclair/typebox";

export const FeishuChatSchema = Type.Union([
  Type.Object({
    action: Type.Literal("get_announcement_info"),
    chat_id: Type.String({ description: "Chat ID to get announcement from" }),
  }),
  Type.Object({
    action: Type.Literal("get_announcement"),
    chat_id: Type.String({ description: "Chat ID to get announcement from" }),
  }),
]);

export type FeishuChatParams = Static<typeof FeishuChatSchema>;