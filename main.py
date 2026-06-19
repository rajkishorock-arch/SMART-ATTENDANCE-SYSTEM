from  tkinter import *
from tkinter import ttk
from tkinter import messagebox
from PIL import Image, ImageTk
from student import Student
import os 
from train import Train
from face_recognition import Face_Recognition
from attendence import Attendence

class FaceRecognition:
    def __init__(self, root):
        self.root = root
        self.root.geometry("1530x790+0+0")
        self.root.title("Face Recognition System")

        # first image
        img = Image.open(r"C:\Users\rajki\Desktop\New folder\image\download.jpg")
        img = img.resize((500, 130), Image.LANCZOS)
        self.photoimg = ImageTk.PhotoImage(img)

        f_lbl = Label(self.root, image=self.photoimg)
        f_lbl.place(x=0, y=0, width=500, height=130)

         # second image
        img1 = Image.open(r"C:\Users\rajki\Desktop\New folder\image\images.jpg")
        img1 = img1.resize((500, 130), Image.LANCZOS)
        self.photoimg1 = ImageTk.PhotoImage(img1)

        f_lbl1 = Label(self.root, image=self.photoimg1)
        f_lbl1.place(x=500, y=0, width=500, height=130)

         # third image
        img2 = Image.open(r"C:\Users\rajki\Desktop\New folder\image\raj.jpg")
        img2 = img2.resize((500, 130), Image.LANCZOS)
        self.photoimg2 = ImageTk.PhotoImage(img2)

        f_lbl2 = Label(self.root, image=self.photoimg2)
        f_lbl2.place(x=1000, y=0, width=550, height=130)

        # background image
        img3 = Image.open(r"C:\Users\rajki\Desktop\New folder\image\im.jpg")
        img3 = img3.resize((1530, 710), Image.LANCZOS)
        self.photoimg3 = ImageTk.PhotoImage(img3) 

        bg_img = Label(self.root, image=self.photoimg3)      
        bg_img.place(x=0, y=130, width=1530, height=710)

        title_lbl = Label(bg_img, text="FACE RECOGNITION ATTENDANCE SYSTEM SOFTWARE", font=(
            "times new roman", 35, "bold"), bg="white", fg="red")
        title_lbl.place(x=0, y=0, width=1530, height=45)

        #student button
        std_img_btn = Image.open(r"C:\Users\rajki\Desktop\New folder\image\s button.jpg")
        std_img_btn = std_img_btn.resize((220, 220), Image.LANCZOS)
        self.photostd_img_btn = ImageTk.PhotoImage(std_img_btn)

        b1 = Button(bg_img, image=self.photostd_img_btn, command=self.student_details,  cursor="hand2")
        b1.place(x=200, y=100, width=220, height=220)

        b1_1 = Button(bg_img, text="STUDENT DETAILS", command=self.student_details, cursor="hand2", font=(
            "times new roman", 15, "bold"), bg="darkblue", fg="white")
        b1_1.place(x=200, y=300, width=220, height=40)

        #detect face button
        detect_img_btn = Image.open(r"C:\Users\rajki\Desktop\New folder\image\detect.jpg")
        detect_img_btn = detect_img_btn.resize((220, 220), Image.LANCZOS)
        self.photodetect_img_btn = ImageTk.PhotoImage(detect_img_btn)

        b2 = Button(bg_img, image=self.photodetect_img_btn,  cursor="hand2", command=self.face_data)
        b2.place(x=500, y=100, width=220, height=220)

        b2_1 = Button(bg_img, text="DETECT FACE", cursor="hand2",command=self.face_data, font=(
            "times new roman", 15, "bold"), bg="darkblue", fg="white")
        b2_1.place(x=500, y=300, width=220, height=40)

        #attendance button
        att_img_btn = Image.open(r"C:\Users\rajki\Desktop\New folder\image\attendence.jpg")
        att_img_btn = att_img_btn.resize((220, 220), Image.LANCZOS)
        self.photoatt_img_btn = ImageTk.PhotoImage(att_img_btn)

        b3 = Button(bg_img, image=self.photoatt_img_btn,  cursor="hand2" ,command=self.attendence_data)
        b3.place(x=800, y=100, width=220, height=220)

        b3_1 = Button(bg_img, text="ATTENDANCE", cursor="hand2",command=self.attendence_data, font=(
            "times new roman", 15, "bold"), bg="darkblue", fg="white")
        b3_1.place(x=800, y=300, width=220, height=40)

        #help button    
        help_img_btn = Image.open(r"C:\Users\rajki\Desktop\New folder\image\help.jpg")
        help_img_btn = help_img_btn.resize((220, 220), Image.LANCZOS)
        self.photohelp_img_btn = ImageTk.PhotoImage(help_img_btn)

        b4 = Button(bg_img, image=self.photohelp_img_btn,  cursor="hand2")
        b4.place(x=1100, y=100, width=220, height=220)

        b4_1 = Button(bg_img, text="HELP", cursor="hand2", font=(
            "times new roman", 15, "bold"), bg="darkblue", fg="white")
        b4_1.place(x=1100, y=300, width=220, height=40)

        #train data button
        traindata_img_btn = Image.open(r"C:\Users\rajki\Desktop\New folder\image\train.jpg")
        traindata_img_btn = traindata_img_btn.resize((220, 220), Image.LANCZOS)
        self.phototraindata_img_btn = ImageTk.PhotoImage(traindata_img_btn)

        b5 = Button(bg_img, image=self.phototraindata_img_btn,  cursor="hand2", command=self.train_data)
        b5.place(x=200, y=400, width=220, height=220)

        b5_1 = Button(bg_img, text="TRAIN DATA", cursor="hand2",command=self.train_data, font=(
            "times new roman", 15, "bold"), bg="darkblue", fg="white")
        b5_1.place(x=200, y=600, width=220, height=40)

        #photos button
        photos_img_btn = Image.open(r"C:\Users\rajki\Desktop\New folder\image\photo.jpg")
        photos_img_btn = photos_img_btn.resize((220, 220), Image.LANCZOS)
        self.photophotos_img_btn = ImageTk.PhotoImage(photos_img_btn)

        b6 = Button(bg_img, image=self.photophotos_img_btn,  cursor="hand2", command=self.open_image)
        b6.place(x=500, y=400, width=220, height=220)

        b6_1 = Button(bg_img, text="PHOTOS", cursor="hand2",command=self.open_image, font=(
            "times new roman", 15, "bold"), bg="darkblue", fg="white")
        b6_1.place(x=500, y=600, width=220, height=40)

        #developer button
        dev_img_btn = Image.open(r"C:\Users\rajki\Desktop\New folder\image\developer.png")
        dev_img_btn = dev_img_btn.resize((220, 220), Image.LANCZOS)
        self.photodev_img_btn = ImageTk.PhotoImage(dev_img_btn)

        b7 = Button(bg_img, image=self.photodev_img_btn,  cursor="hand2")
        b7.place(x=800, y=400, width=220, height=220)

        b7_1 = Button(bg_img, text="DEVELOPER", cursor="hand2", font=(
            "times new roman", 15, "bold"), bg="darkblue", fg="white")
        b7_1.place(x=800, y=600, width=220, height=40)

        #exit button
        exit_img_btn = Image.open(r"C:\Users\rajki\Desktop\New folder\image\exit.jpg")
        exit_img_btn = exit_img_btn.resize((220, 220), Image.LANCZOS)
        self.photoexit_img_btn = ImageTk.PhotoImage(exit_img_btn)

        b8 = Button(bg_img, image=self.photoexit_img_btn,  cursor="hand2")
        b8.place(x=1100, y=400, width=220, height=220)

        b8_1 = Button(bg_img, text="EXIT", cursor="hand2", font=(
            "times new roman", 15, "bold"), bg="darkblue", fg="white")
        b8_1.place(x=1100, y=600, width=220, height=40)

    #photo
    def open_image(self):
        base_dir = os.path.dirname(os.path.abspath(__file__))
        data_dir = os.path.join(base_dir, "data")
        if os.path.exists(data_dir):
            os.startfile(data_dir)
        else:
            messagebox.showerror("Error", f"Data folder not found at: {data_dir}", parent=self.root)
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

            
if __name__ == "__main__":
    root = Tk()
    obj = FaceRecognition(root)
    root.mainloop()        
