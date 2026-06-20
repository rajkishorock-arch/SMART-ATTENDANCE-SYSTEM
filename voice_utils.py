import pyttsx3
import threading
import speech_recognition as sr

def speak_text(text):
    """Speaks the given text using pyttsx3."""
    try:
        engine = pyttsx3.init()
        # Set properties
        voices = engine.getProperty('voices')
        # try to use a female/system voice if available, else default
        for voice in voices:
            if "Zira" in voice.name or "female" in voice.name.lower():
                engine.setProperty('voice', voice.id)
                break
        engine.setProperty('rate', 150)
        engine.say(text)
        engine.runAndWait()
    except Exception as e:
        print(f"TTS Error: {e}")

def speak_async(text):
    """Spawns a thread to speak the given text without blocking the main GUI."""
    threading.Thread(target=speak_text, args=(text,), daemon=True).start()

def listen_command():
    """Listens for a single voice command using the microphone and returns it as lowercase text."""
    recognizer = sr.Recognizer()
    try:
        with sr.Microphone() as source:
            print("Listening for command...")
            recognizer.adjust_for_ambient_noise(source, duration=0.5)
            audio = recognizer.listen(source, timeout=5, phrase_time_limit=5)
            print("Recognizing...")
            command = recognizer.recognize_google(audio)
            print(f"Command heard: {command}")
            return command.lower()
    except sr.WaitTimeoutError:
        print("Listening timed out.")
    except sr.UnknownValueError:
        print("Could not understand audio.")
    except Exception as e:
        print(f"Speech recognition error: {e}")
    return ""

