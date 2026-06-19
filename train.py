from fileinput import filename
from  tkinter import *
from tkinter import ttk
from tkinter import messagebox
from PIL import Image, ImageTk
import mysql.connector
import cv2
import os
import numpy as np
from face_utils import create_lbph_recognizer, preprocess_face

class Train:
    def __init__(self, root):
        self.root = root
        self.root.geometry("1530x790+0+0")
        self.root.title("Face Recognition System")

        title_lbl = Label(self.root, text="TRAIN DATA SET", font=(
            "times new roman", 35, "bold"), bg="white", fg="red")
        title_lbl.place(x=0, y=0, width=1530, height=45)

        img_top = Image.open(r"C:\Users\rajki\Desktop\New folder\train.jpg")
        img_top = img_top.resize((1530, 325), Image.LANCZOS)
        self.photoimg_top = ImageTk.PhotoImage(img_top) 

        f_lbl = Label(self.root, image=self.photoimg_top)      
        f_lbl.place(x=0, y=45, width=1530, height=325)

        #buton 
        b1 = Button(self.root, text="TRAIN DATA", cursor="hand2", font=(
            "times new roman", 30, "bold"), bg="darkblue", fg="white", command=self.train_classifier)
        b1.place(x=0, y=370, width=1530, height=60)        

        # Optional decorative image (avoid crashing if file missing)
        try:
            img_bottom = Image.open(r"C:\Users\rajki\Desktop\New folder\people.jpg")
            img_bottom = img_bottom.resize((1530, 325), Image.LANCZOS)
            self.photoimg_bottom = ImageTk.PhotoImage(img_bottom)
            f_lbl = Label(self.root, image=self.photoimg_bottom)
            f_lbl.place(x=0, y=430, width=1530, height=325)
        except Exception:
            pass

        


        
    def train_classifier(self):
        base_dir = os.path.dirname(os.path.abspath(__file__))
        data_dir = os.path.join(base_dir, "data")
        path = [os.path.join(data_dir, file) for file in os.listdir(data_dir) if file.startswith("user.")]
        print("Files found:", path)

        faces = []
        ids = []

        for image in path:
            print("Reading:", image)
            filename = os.path.split(image)[1]
            parts = filename.split('.')

            if len(parts) < 4 or parts[0] != "user" or parts[1] == "":
                print("Skipping invalid file:", filename)
                continue

            try:
                id = int(parts[1])
            except ValueError:
                print("Skipping invalid ID in file:", filename)
                continue

            img = Image.open(image).convert('L')
            raw_image = np.array(img, 'uint8')
            imageNp = preprocess_face(raw_image)

            # Include low-detail variants so faces remain recognizable when
            # several people are in frame or they are farther from the camera.
            training_images = [imageNp]
            for size in (60, 100):
                low_resolution = cv2.resize(
                    raw_image,
                    (size, size),
                    interpolation=cv2.INTER_AREA,
                )
                training_images.append(preprocess_face(low_resolution))

            # Light augmentation for robustness (pose/lighting changes)
            # LBPH works on grayscale histograms, so small transforms help.
            augmented = []
            for img_gray in training_images:
                augmented.append(img_gray)
                # horizontal flip
                augmented.append(cv2.flip(img_gray, 1))
                # brightness/contrast variations
                augmented.append(cv2.convertScaleAbs(img_gray, alpha=1.15, beta=10))
                augmented.append(cv2.convertScaleAbs(img_gray, alpha=0.85, beta=-10))

            training_images = augmented

            faces.extend(training_images)
            ids.extend([id] * len(training_images))
            cv2.imshow("Training", imageNp)
            cv2.waitKey(1) == 13


        if len(faces) == 0:
            cv2.destroyAllWindows()
            messagebox.showerror("Error", "No valid face dataset found for training.", parent=self.root)
            return

        ids = np.array(ids)

        # train the classifier and save
        clf = create_lbph_recognizer()
        clf.train(faces, ids)
        classifier_file = os.path.join(base_dir, "classifier.xml")
        clf.write(classifier_file)
        cv2.destroyAllWindows()
        messagebox.showinfo("Result", "Training datasets completed!!", parent=self.root)




if __name__ == "__main__":
    root = Tk()
    obj = Train(root)
    root.mainloop()        
