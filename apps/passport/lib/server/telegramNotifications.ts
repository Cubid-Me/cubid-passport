import { getOptionalEnv, getRequiredEnv } from "@cubid/config"

type TelegramNotificationInput = {
  body: string
  category: string
  chatId: string
  fromAppName: string
  priority: string
  title: string
}

let sendNotificationTelegramForTests:
  | ((input: TelegramNotificationInput) => Promise<void>)
  | null = null

export const setSendNotificationTelegramForTests = (
  sender: ((input: TelegramNotificationInput) => Promise<void>) | null
) => {
  sendNotificationTelegramForTests = sender
}

const buildTelegramMessage = (input: TelegramNotificationInput) =>
  [
    `*${input.title}*`,
    "",
    input.body,
    "",
    `From: ${input.fromAppName}`,
    `Category: ${input.category}`,
    `Priority: ${input.priority}`,
  ].join("\n")

export const sendNotificationTelegram = async (
  input: TelegramNotificationInput
) => {
  if (sendNotificationTelegramForTests) {
    await sendNotificationTelegramForTests(input)
    return
  }

  const token = getRequiredEnv("TELEGRAM_BOT_TOKEN")
  const apiBaseUrl =
    getOptionalEnv("TELEGRAM_BOT_API_BASE_URL") ?? "https://api.telegram.org"
  const url = `${apiBaseUrl.replace(/\/$/, "")}/bot${token}/sendMessage`

  const response = await fetch(url, {
    body: JSON.stringify({
      chat_id: input.chatId,
      disable_web_page_preview: true,
      parse_mode: "Markdown",
      text: buildTelegramMessage(input),
    }),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  })

  if (!response.ok) {
    throw new Error(`Telegram delivery failed with status ${response.status}.`)
  }

  const payload = (await response.json().catch(() => null)) as {
    description?: string
    ok?: boolean
  } | null

  if (!payload?.ok) {
    throw new Error(
      payload?.description
        ? `Telegram delivery failed: ${payload.description}`
        : "Telegram delivery failed."
    )
  }
}
