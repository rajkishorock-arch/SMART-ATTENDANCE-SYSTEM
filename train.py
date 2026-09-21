from fileinput import filename
from  tkinter import *
from tkinter import ttk
from tkinter import messagebox
from PIL import Image, ImageTk
import mysql.connector
import cv2
import os
import numpy as np
from face_utils import (
    get_face_engines,
    get_db_connection,
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

class Train:
    def __init__(self, root):
        self.root = root

        # ── Theme bootstrap ─────────────────────────────────────────────
        content = setup_standard_window(
            root,
            "Sync Database Embeddings",
            subtitle_text="Deep Learning  •  YuNet + SFace  •  Local Photos → MySQL"
        )

        # ── Centered info + action card ────────────────────────────────
        outer = Frame(content, bg=UI_BG)
        outer.pack(fill="both", expand=True)

        card = make_card(outer, padx=UI_PAD_XL if hasattr(UI_PAD, 'real') else UI_PAD_LG * 2,
                         pady=UI_PAD_LG * 2)
        card.pack(padx=100, pady=40, fill="both", expand=True)
        cc = card._inner

        # Icon + title
        top_row = Frame(cc, bg=UI_SURFACE)
        top_row.pack(fill="x")

        icon_lbl = Label(top_row, text="🔄", font=("Segoe UI", 52, "normal"),
                         bg=UI_SURFACE, fg=UI_PRIMARY)
        icon_lbl.pack(side="left")

        title_col = Frame(top_row, bg=UI_SURFACE)
        title_col.pack(side="left", fill="x", expand=True, padx=UI_PAD_LG)

        title = Label(title_col, text="Re-Sync Face Embeddings",
                      font=("Segoe UI", 20, "bold"), bg=UI_SURFACE, fg=UI_TEXT)
        title.pack(anchor="w")

        subtitle = Label(title_col,
                         text="Converts local JPG photo samples into SFace 128-D vectors and writes them to the student table.",
                         font=UI_FONT_BODY, bg=UI_SURFACE, fg=UI_TEXT_MUTED, wraplength=700, justify="left")
        subtitle.pack(anchor="w", pady=(UI_PAD_SM, 0))

        # Separator
        sep = Frame(cc, bg=UI_BORDER, height=1)
        sep.pack(fill="x", pady=UI_PAD_LG)

        # Feature bullets
        bullets = [
            ("✅", "Direct & Instant — No LBPH classifier training file required."),
            ("🧠", "Uses YuNet detector + SFace embedding extractor (ONNX models)."),
            ("📁", "Scans `data/user.{student_id}.{n}.jpg` files in the local data folder."),
            ("🗄️", "Updates `student.face_embedding` JSON and sets `photo='yes'` in MySQL."),
            ("📺", "Live preview window shows each image during the synchronization pass."),
        ]
        bullets_frame = Frame(cc, bg=UI_SURFACE)
        bullets_frame.pack(fill="x", pady=(0, UI_PAD_LG))
        for icon, text in bullets:
            row = Frame(bullets_frame, bg=UI_SURFACE)
            row.pack(fill="x", pady=UI_PAD_SM)
            Label(row, text=icon, font=UI_FONT_BODY,
                  bg=UI_SURFACE, fg=UI_SUCCESS).pack(side="left", padx=(0, UI_PAD_SM))
            Label(row, text=text, font=UI_FONT_BODY,
                  bg=UI_SURFACE, fg=UI_TEXT).pack(side="left", anchor="w")

        # Info chips
        chips_row = Frame(cc, bg=UI_SURFACE)
        chips_row.pack(anchor="w", pady=(0, UI_PAD_LG))
        make_status_chip(chips_row, " AI Models: YuNet + SFace ", "info").pack(side="left", padx=(0, UI_PAD_SM))
        make_status_chip(chips_row, " Storage: MySQL student table ", "loading").pack(side="left", padx=(0, UI_PAD_SM))
        make_status_chip(chips_row, " Output: 128-D Embedding JSON ", "success").pack(side="left")

        # Separator
        sep2 = Frame(cc, bg=UI_BORDER, height=1)
        sep2.pack(fill="x", pady=(0, UI_PAD_LG))

        # Primary action
        b1 = Button(cc, text="▶  Start Sync Now", command=self.sync_embeddings,
                    font=UI_FONT_BTN_LG, pady=14)
        style_button(b1, variant="primary")
        b1.pack(fill="x")

        # Footer note
        note = Label(cc,
                     text="Tip: Normal day-to-day enrollment is done via Student Details → Take Photo Sample. "
                          "Use this sync tool only if you have manually added JPG files to the `data/` folder.",
                     font=("Segoe UI", 10, "italic"),
                     bg=UI_SURFACE, fg=UI_TEXT_MUTED,
                     wraplength=900, justify="left")
        note.pack(anchor="w", pady=(UI_PAD_LG, 0))

    def sync_embeddings(self):
        import json
        
        base_dir = os.path.dirname(os.path.abspath(__file__))
        data_dir = os.path.join(base_dir, "data")
        
        if not os.path.exists(data_dir):
            messagebox.showerror("Error", f"Data folder not found at: {data_dir}", parent=self.root)
            return

        path = [os.path.join(data_dir, file) for file in os.listdir(data_dir) if file.startswith("user.") and file.endswith(".jpg")]
        print("Files found for sync:", path)

        if len(path) == 0:
            messagebox.showinfo("Sync Info", "No local face photos found in data/ folder to sync.", parent=self.root)
            return

        try:
            detector, recognizer = get_face_engines()
        except Exception as model_err:
            messagebox.showerror("Model Error", f"Failed to load Deep Learning models:\n{model_err}", parent=self.root)
            return

        try:
            conn = get_db_connection()
            my_cursor = conn.cursor()
        except Exception as db_err:
            messagebox.showerror("Database Error", f"Failed to connect to database:\n{db_err}", parent=self.root)
            return

        synced_count = 0
        failed_count = 0
        
        cv2.namedWindow("Syncing Embeddings", cv2.WINDOW_NORMAL)
        cv2.resizeWindow("Syncing Embeddings", 600, 400)

        for image_path in path:
            filename = os.path.basename(image_path)
            parts = filename.split('.')

            # Expected format: user.{id}.{sample_num}.jpg
            if len(parts) < 4 or parts[0] != "user" or parts[1] == "":
                print("Skipping invalid file:", filename)
                continue

            try:
                student_id = int(parts[1])
            except ValueError:
                print("Skipping invalid ID in file:", filename)
                continue

            # Read image
            img = cv2.imread(image_path)
            if img is None or img.size == 0:
                print("Skipping unreadable image:", filename)
                continue

            cv2.imshow("Syncing Embeddings", img)
            cv2.waitKey(10)

            # Get 128D SFace embedding
            try:
                h, w = img.shape[:2]
                detector.setInputSize((w, h))
                retval, faces = detector.detect(img)
                if retval and faces is not None and len(faces) > 0:
                    best_face_idx = 0
                    if len(faces) > 1:
                        best_face_idx = np.argmax(faces[:, 14])
                    
                    face = faces[best_face_idx]
                    aligned_face = recognizer.alignCrop(img, face)
                    feature = recognizer.feature(aligned_face) # (1, 128)
                    
                    if feature is not None:
                        embedding_list = feature[0].tolist()
                        embedding_json = json.dumps(embedding_list)
                        
                        # Save embedding and update photo status to 'yes'
                        my_cursor.execute("update student set `face_embedding`=%s, `photo`='yes' where `id`=%s", (
                            embedding_json,
                            student_id
                        ))
                        synced_count += 1
                        print(f"Successfully synced embedding for Student ID {student_id}")
                    else:
                        failed_count += 1
                else:
                    failed_count += 1
            except Exception as e:
                print(f"Error syncing {filename}: {e}")
                failed_count += 1

        conn.commit()
        conn.close()
        cv2.destroyAllWindows()

        messagebox.showinfo("Result", f"Sync completed!\nSuccessfully synced: {synced_count}\nFailed/No face: {failed_count}", parent=self.root)




if __name__ == "__main__":
    root = Tk()
    obj = Train(root)
    root.mainloop()        
