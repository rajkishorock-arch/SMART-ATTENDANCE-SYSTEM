from tkinter import *
from tkinter import ttk
from tkinter import messagebox
from PIL import Image, ImageTk
from student import Student
import os
from train import Train
from face_recognition import Face_Recognition
from attendence import Attendence
from face_utils import (
    setup_standard_window,
    make_card,
    make_button,
    make_section_label,
    make_status_chip,
    style_button,
    UI_BG, UI_SURFACE, UI_SURFACE_ALT, UI_PRIMARY, UI_ACCENT,
    UI_TEXT, UI_TEXT_MUTED, UI_SUCCESS, UI_DANGER, UI_INFO, UI_WARNING,
    UI_PAD, UI_PAD_LG, UI_PAD_SM,
    UI_FONT_HEADING, UI_FONT_SUBTITLE, UI_FONT_BODY, UI_FONT_LABEL, UI_FONT_BTN_LG,
)
from voice_utils import speak_async, listen_command
import threading


class FaceRecognition:
    def __init__(self, root):
        self.root = root

        # ── Theme bootstrap ─────────────────────────────────────────────
        content = setup_standard_window(
            root,
            "Smart Attendance System",
            subtitle_text="Dashboard  •  Face Recognition & Biometric Attendance"
        )

        speak_async(
            "Welcome to the advanced face recognition attendance system. "
            "System is fully operational."
        )

        # ── Welcome + Status row ────────────────────────────────────────
        top_row = Frame(content, bg=UI_BG)
        top_row.pack(fill="x", pady=(0, UI_PAD_LG))

        welcome_card = make_card(top_row, padx=UI_PAD_LG, pady=UI_PAD_LG)
        welcome_card.pack(side="left", fill="both", expand=True, padx=(0, UI_PAD_LG))
        wc_inner = welcome_card._inner

        hello_lbl = Label(
            wc_inner, text="Welcome back 👋",
            font=UI_FONT_SUBTITLE, bg=UI_SURFACE, fg=UI_PRIMARY
        )
        hello_lbl.pack(anchor="w")

        title_lbl = Label(
            wc_inner, text="Face Recognition Attendance Dashboard",
            font=("Segoe UI", 18, "bold"), bg=UI_SURFACE, fg=UI_TEXT
        )
        title_lbl.pack(anchor="w", pady=(UI_PAD_SM, 0))

        desc_lbl = Label(
            wc_inner,
            text="Secure biometric student attendance powered by YuNet detection & SFace deep-learning embeddings with dual-shield liveness verification.",
            font=UI_FONT_BODY, bg=UI_SURFACE, fg=UI_TEXT_MUTED,
            wraplength=700, justify="left"
        )
        desc_lbl.pack(anchor="w", pady=(UI_PAD_SM, 0))

        # Status chips
        chips_row = Frame(wc_inner, bg=UI_SURFACE)
        chips_row.pack(anchor="w", pady=(UI_PAD, 0))

        chip_engine = make_status_chip(chips_row, "●  AI Engine  Ready", "success")
        chip_engine.pack(side="left", padx=(0, UI_PAD_SM))

        chip_live = make_status_chip(chips_row, "●  Liveness  Active", "info")
        chip_live.pack(side="left", padx=(0, UI_PAD_SM))

        chip_db = make_status_chip(chips_row, "●  Database  Connected", "loading")
        chip_db.pack(side="left")

        # ── Voice Assistant card (right top) ────────────────────────────
        voice_card = make_card(top_row, padx=UI_PAD_LG, pady=UI_PAD_LG)
        voice_card.pack(side="right", fill="y", padx=(UI_PAD_LG, 0))
        vc_inner = voice_card._inner

        voice_hdr = make_section_label(vc_inner, "Voice Assistant", color=UI_PRIMARY)
        voice_hdr.pack(anchor="w")

        voice_sub = Label(
            vc_inner,
            text="Hands-free navigation using\nwake-word speech commands.",
            font=UI_FONT_BODY, bg=UI_SURFACE, fg=UI_TEXT_MUTED, justify="left"
        )
        voice_sub.pack(anchor="w", pady=(UI_PAD_SM, UI_PAD))

        self.voice_btn = Button(
            vc_inner, text="🎙️  Activate Voice", command=self.activate_voice,
            font=UI_FONT_BTN_LG, pady=10
        )
        style_button(self.voice_btn, variant="success")
        self.voice_btn.pack(fill="x")

        tips_lbl = Label(
            vc_inner,
            text='Try: "Open Student Details"  •  "Detect Face"  •  "Exit"',
            font=("Segoe UI", 9, "normal"),
            bg=UI_SURFACE, fg=UI_TEXT_MUTED, justify="left", wraplength=250
        )
        tips_lbl.pack(anchor="w", pady=(UI_PAD, 0))

        # ── Section heading ─────────────────────────────────────────────
        sec_hdr = make_section_label(content, "Quick Actions", color=UI_TEXT)
        sec_hdr.pack(anchor="w", pady=(0, UI_PAD))

        # ── Action Cards Grid ───────────────────────────────────────────
        # 4 columns grid. Each card = icon symbol + title + desc + button.
        actions = [
            # (icon, title, desc, command, variant)
            ("👥", "Student Details",
             "Register new students, manage profiles, capture face samples, and update enrollment records.",
             self.student_details, "primary"),

            ("🔍", "Detect Face",
             "Launch the live camera scanner with YuNet + SFace recognition and blink-based liveness verification.",
             self.face_data, "primary"),

            ("📋", "Attendance",
             "View, import, export, and manually edit attendance records pulled from CSV and MySQL database.",
             self.attendence_data, "primary"),

            ("🔄", "Train / Sync Data",
             "Re-synchronize local photo samples into database embeddings when deep-learning re-enrollment is needed.",
             self.train_data, "secondary"),

            ("📁", "Photos Folder",
             "Open the local data/ directory containing all captured student reference face crops.",
             self.open_image, "secondary"),

            ("🛡️", "Biometric Liveness",
             "The system automatically enforces 2+ blink liveness challenge during every recognition pass.",
             self._noop, "ghost"),

            ("👨‍💻", "Developer",
             "Developer information and build metadata for the Smart Attendance desktop client.",
             self._show_developer, "ghost"),

            ("🚪", "Exit",
             "Safely close the dashboard and shut down all background face-recognition services.",
             self.root.destroy, "danger"),
        ]

        grid = Frame(content, bg=UI_BG)
        grid.pack(fill="both", expand=True)

        COLS = 4
        for i, (icon, title, desc, cmd, variant) in enumerate(actions):
            r, c = divmod(i, COLS)

            card = make_card(grid, padx=UI_PAD_LG, pady=UI_PAD_LG)
            card.grid(row=r, column=c, sticky="nsew",
                      padx=UI_PAD_SM, pady=UI_PAD_SM)
            grid.grid_columnconfigure(c, weight=1)
            grid.grid_rowconfigure(r, weight=1)

            ci = card._inner

            icon_lbl = Label(
                ci, text=icon, font=("Segoe UI", 30, "normal"),
                bg=UI_SURFACE, fg=UI_PRIMARY
            )
            icon_lbl.pack(anchor="w")

            t_lbl = Label(
                ci, text=title, font=("Segoe UI", 13, "bold"),
                bg=UI_SURFACE, fg=UI_TEXT
            )
            t_lbl.pack(anchor="w", pady=(UI_PAD_SM, 0))

            d_lbl = Label(
                ci, text=desc, font=("Segoe UI", 10, "normal"),
                bg=UI_SURFACE, fg=UI_TEXT_MUTED,
                wraplength=250, justify="left"
            )
            d_lbl.pack(anchor="w", pady=(UI_PAD_SM, UI_PAD))

            btn = make_button(ci, "Open →", command=cmd, variant=variant)
            btn.pack(anchor="w", side="bottom")

    # ── Actions (unchanged backend logic) ─────────────────────────────
    def _noop(self):
        pass

    def _show_developer(self):
        messagebox.showinfo(
            "Developer Info",
            "Smart Attendance System — Desktop Client\n"
            "Build: Deep Learning (YuNet + SFace)\n\n"
            "A biometric attendance suite with face recognition,\n"
            "liveness detection, attendance reports, and student management.\n\n"
            "© Rajkishor — Enterprise Edition",
            parent=self.root
        )

    def open_image(self):
        data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
        if os.path.exists(data_dir):
            os.startfile(data_dir)
        else:
            messagebox.showerror(
                "Error", f"Data folder not found: {data_dir}", parent=self.root
            )

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
        self.voice_btn.config(text="🎙️  Listening...")
        threading.Thread(target=self._listen_thread, daemon=True).start()

    def _listen_thread(self):
        speak_async("I am listening. Tell me what to do.")
        command = listen_command()
        self.root.after(0, lambda: self.voice_btn.config(text="🎙️  Activate Voice"))

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
