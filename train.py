from fileinput import filename
from  tkinter import *
from tkinter import ttk
from tkinter import messagebox
from PIL import Image, ImageTk
import mysql.connector
import cv2
import os
import numpy as np
from face_utils import get_face_engines, get_db_connection

class Train:
    def __init__(self, root):
        self.root = root
        self.screen_width = self.root.winfo_screenwidth()
        self.screen_height = self.root.winfo_screenheight()
        self.root.geometry(f"{self.screen_width}x{self.screen_height}+0+0")
        self.root.state('zoomed')
        self.root.title("Face Recognition System")

        title_lbl = Label(self.root, text="SYNC DATABASE EMBEDDINGS", font=(
            "times new roman", 35, "bold"), bg="white", fg="red")
        title_lbl.place(x=0, y=0, width=self.screen_width, height=45)

        img_top = Image.open(r"C:\Users\rajki\Desktop\New folder\train.jpg")
        img_top = img_top.resize((1530, 325), Image.LANCZOS)
        self.photoimg_top = ImageTk.PhotoImage(img_top) 

        f_lbl = Label(self.root, image=self.photoimg_top)      
        f_lbl.place(x=0, y=45, width=1530, height=325)

        #buton 
        b1 = Button(self.root, text="SYNC FACE EMBEDDINGS", cursor="hand2", font=(
            "times new roman", 30, "bold"), bg="darkblue", fg="white", command=self.sync_embeddings)
        b1.place(x=0, y=370, width=1530, height=60)        

        # Description
        desc_lbl = Label(self.root, text="Deep Learning (YuNet & SFace) is active. Enrollment is direct and instant!\nManual training is obsolete. Use this tool if you need to re-sync local photo samples to the database.", font=("Courier", 13, "bold"), bg="#0a0a0a", fg="#00ff00")
        desc_lbl.place(x=0, y=440, width=1530, height=50)

        # Optional decorative image (avoid crashing if file missing)
        try:
            img_bottom = Image.open(r"C:\Users\rajki\Desktop\New folder\people.jpg")
            img_bottom = img_bottom.resize((1530, 250), Image.LANCZOS)
            self.photoimg_bottom = ImageTk.PhotoImage(img_bottom)
            f_lbl = Label(self.root, image=self.photoimg_bottom)
            f_lbl.place(x=0, y=500, width=1530, height=250)
        except Exception:
            pass

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
