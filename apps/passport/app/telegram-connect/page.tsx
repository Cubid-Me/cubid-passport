// @ts-nocheck
"use client"
import Script from 'next/script'

export default function TelegramConnect() {

  return (
    <div className="p-3">
      <Script
        async
        src="https://telegram.org/js/telegram-widget.js?22"
        data-telegram-login="cubid_bot"
        data-size="medium"
        data-auth-url="https://passport.cubid.me/telegram"
        data-request-access="write"
      ></Script>
    </div>
  )
}
