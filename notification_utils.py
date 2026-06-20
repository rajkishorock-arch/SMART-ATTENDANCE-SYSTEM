import urllib.request
import urllib.parse
import os
import threading

def send_telegram_message_async(message):
    """
    Sends a message to a Telegram chat using a bot.
    Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in environment variables or .env
    """
    bot_token = os.environ.get("TELEGRAM_BOT_TOKEN", "YOUR_BOT_TOKEN_HERE")
    chat_id = os.environ.get("TELEGRAM_CHAT_ID", "YOUR_CHAT_ID_HERE")
    
    if bot_token == "YOUR_BOT_TOKEN_HERE" or chat_id == "YOUR_CHAT_ID_HERE":
        print(f"Telegram not configured. Log: {message}")
        return

    def _send():
        try:
            url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
            data = urllib.parse.urlencode({"chat_id": chat_id, "text": message}).encode("utf-8")
            req = urllib.request.Request(url, data=data)
            with urllib.request.urlopen(req, timeout=5) as response:
                if response.getcode() == 200:
                    print("Telegram notification sent successfully.")
        except Exception as e:
            print(f"Failed to send Telegram message: {e}")

    threading.Thread(target=_send, daemon=True).start()

