from tkinter import *
from tkinter import ttk
from tkinter import messagebox
from PIL import Image, ImageTk
from student import Student
import os
from train import Train
from face_recognition import Face_Recognition
from attendence import Attendence
from face_utils import TechRadarCanvas, animate_typewriter, animate_neon_pulse, bind_button_glow
from voice_utils import speak_async, listen_command
import threading

class FaceRecognition:
    def __init__(self, root):
        self.root = root
        self.screen_width = self.root.winfo_screenwidth()
        self.screen_height = self.root.winfo_screenheight()
        self.root.geometry(f"{self.screen_width}x{self.screen_height}+0+0")
        self.root.state('zoomed')
        self.root.title("Face Recognition System")
        self.root.configure(bg="#0a0a0a")

        speak_async("Welcome to the advanced face recognition attendance system. System is fully operational.")

        # ── Top header images ────────────────────────────────────────────────
        img_w = self.screen_width // 3
        for path, x in [
            (r"C:\Users\rajki\Desktop\New folder\image\download.jpg", 0),
            (r"C:\Users\rajki\Desktop\New folder\image\images.jpg",  img_w),
            (r"C:\Users\rajki\Desktop\New folder\image\raj.jpg",     img_w * 2),
        ]:
            try:
                _img = Image.open(path).resize((img_w, 130), Image.LANCZOS)
                ref = ImageTk.PhotoImage(_img)
                lbl = Label(self.root, image=ref, bg="#0a0a0a")
                lbl.image = ref          # keep reference
                lbl.place(x=x, y=0, width=img_w, height=130)
            except Exception:
                pass

        # ── Background ───────────────────────────────────────────────────────
        try:
            _bg = Image.open(r"C:\Users\rajki\Desktop\New folder\image\im.jpg").resize((self.screen_width, self.screen_height - 130), Image.LANCZOS)
            self.photoimg3 = ImageTk.PhotoImage(_bg)
            bg = Label(self.root, image=self.photoimg3, bg="#0a0a0a")
        except Exception:
            bg = Label(self.root, bg="#0a0a0a")
        bg.place(x=0, y=130, width=self.screen_width, height=self.screen_height - 130)

        # ── Animated Typewriter + Neon Title ─────────────────────────────────
        TITLE = "FACE RECOGNITION ATTENDANCE SYSTEM SOFTWARE"
        title_lbl = Label(bg, text="", font=("Courier", 22, "bold"),
                          bg="#000000", fg="#00ff00")
        title_lbl.place(x=0, y=0, width=self.screen_width, height=45)
        delay_ms = 40
        total_ms  = len(TITLE) * delay_ms + 300
        self.root.after(300,  lambda: animate_typewriter(title_lbl, TITLE, delay=delay_ms))
        self.root.after(total_ms + 600,
                        lambda: animate_neon_pulse(title_lbl,
                                                   colors=["#00ff00","#00ffff","#ff00ff","#ffffff","#00ff88"],
                                                   delay=1000))

        # ── Rotating Tech Radar (top-right slot) ─────────────────────────────
        radar = TechRadarCanvas(bg, width=220, height=220, bg="#000000",
                                highlightthickness=1, highlightbackground="#00ff00")
        radar.place(x=1100, y=100, width=220, height=220)

        # ── Helper to make an image button + glowing text button ─────────────
        def make_btn(parent, img_path, text, cmd, x, y,
                     hover_bg, hover_fg, normal_bg, normal_fg):
            try:
                _i = Image.open(img_path).resize((220, 220), Image.LANCZOS)
                ref = ImageTk.PhotoImage(_i)
                ib = Button(parent, image=ref, command=cmd, cursor="hand2", bd=0)
                ib.image = ref
                ib.place(x=x, y=y, width=220, height=220)
            except Exception:
                pass
            tb = Button(parent, text=text, command=cmd, cursor="hand2",
                        font=("Courier", 13, "bold"), relief=FLAT)
            tb.place(x=x, y=y+200, width=220, height=40)
            bind_button_glow(tb, hover_bg=hover_bg, hover_fg=hover_fg,
                             normal_bg=normal_bg, normal_fg=normal_fg)

        # ── Dashboard Buttons ─────────────────────────────────────────────────
        make_btn(bg,
                 r"C:\Users\rajki\Desktop\New folder\image\s button.jpg",
                 "STUDENT DETAILS", self.student_details,
                 200, 100, "#00ff00", "black", "#003300", "#00ff00")

        make_btn(bg,
                 r"C:\Users\rajki\Desktop\New folder\image\detect.jpg",
                 "DETECT FACE", self.face_data,
                 500, 100, "#00ffff", "black", "#003333", "#00ffff")

        make_btn(bg,
                 r"C:\Users\rajki\Desktop\New folder\image\attendence.jpg",
                 "ATTENDANCE", self.attendence_data,
                 800, 100, "#ff00ff", "black", "#330033", "#ff00ff")

        # VOICE ASSISTANT button below radar
        self.voice_btn = Button(bg, text="VOICE ASSIST", cursor="hand2", command=self.activate_voice,
                          font=("Courier", 13, "bold"), relief=FLAT)
        self.voice_btn.place(x=1100, y=300, width=220, height=40)
        bind_button_glow(self.voice_btn, "#00ff00", "black", "#001a00", "#00ff00")

        make_btn(bg,
                 r"C:\Users\rajki\Desktop\New folder\image\train.jpg",
                 "TRAIN DATA", self.train_data,
                 200, 400, "#ffff00", "black", "#333300", "#ffff00")

        make_btn(bg,
                 r"C:\Users\rajki\Desktop\New folder\image\photo.jpg",
                 "PHOTOS", self.open_image,
                 500, 400, "#00ffff", "black", "#003333", "#00ffff")

        make_btn(bg,
                 r"C:\Users\rajki\Desktop\New folder\image\developer.png",
                 "DEVELOPER", lambda: None,
                 800, 400, "#ff00ff", "black", "#330033", "#ff00ff")

        make_btn(bg,
                 r"C:\Users\rajki\Desktop\New folder\image\exit.jpg",
                 "EXIT", self.root.destroy,
                 1100, 400, "#ff3300", "white", "#330000", "#ff3300")

    # ── Actions ───────────────────────────────────────────────────────────────
    def open_image(self):
        data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
        if os.path.exists(data_dir):
            os.startfile(data_dir)
        else:
            messagebox.showerror("Error", f"Data folder not found: {data_dir}", parent=self.root)

    def student_details(self):
        self.new_window = Toplevel(self.root)
        self.app = Student(self.new_window)

    def train_data(self):
        self.new_window = Toplevel(self.root)
        self.app = Train(self.new_window)

    def face_data(self):
        self.new_window = Toplevel(self.root)
        self.app = Face_Recognition(self.new_window)

    def attendence_data(self):
        self.new_window = Toplevel(self.root)
        self.app = Attendence(self.new_window)

    def activate_voice(self):
        self.voice_btn.config(text="LISTENING...", fg="yellow")
        threading.Thread(target=self._listen_thread, daemon=True).start()

    def _listen_thread(self):
        speak_async("I am listening. Tell me what to do.")
        command = listen_command()
        self.root.after(0, lambda: self.voice_btn.config(text="VOICE ASSIST", fg="#00ff00"))
        
        if not command:
            return
            
        if "student" in command or "details" in command:
            speak_async("Opening student details.")
            self.root.after(0, self.student_details)
        elif "detect" in command or "face" in command or "recognition" in command:
            speak_async("Activating face recognition.")
            self.root.after(0, self.face_data)
        elif "attendance" in command:
            speak_async("Opening attendance records.")
            self.root.after(0, self.attendence_data)
        elif "train" in command or "data" in command:
            speak_async("Opening training module.")
            self.root.after(0, self.train_data)
        elif "photo" in command or "image" in command:
            speak_async("Opening photos folder.")
            self.root.after(0, self.open_image)
        elif "exit" in command or "close" in command or "quit" in command:
            speak_async("Shutting down the system. Goodbye.")
            self.root.after(2000, self.root.destroy)
        else:
            speak_async(f"Sorry, I do not understand the command: {command}")



if __name__ == "__main__":
    root = Tk()
    obj = FaceRecognition(root)
    root.mainloop()
