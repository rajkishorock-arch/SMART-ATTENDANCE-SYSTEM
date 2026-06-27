import os
from  tkinter import *
from tkinter import ttk
from tkinter import messagebox
from PIL import Image, ImageTk
from tkinter import messagebox
import mysql.connector
import cv2
import numpy as np
from face_utils import open_camera, preprocess_face, get_db_connection, get_face_engines

class Student:
    def __init__(self, root):
        self.root = root
        self.screen_width = self.root.winfo_screenwidth()
        self.screen_height = self.root.winfo_screenheight()
        self.root.geometry(f"{self.screen_width}x{self.screen_height}+0+0")
        self.root.state('zoomed')
        self.root.title("Face Recognition System")

        #variables
        self.var_dep = StringVar()
        self.var_course = StringVar()
        self.var_year = StringVar()
        self.var_semester = StringVar()
        self.var_id = StringVar()
        self.var_name = StringVar()
        self.var_div = StringVar()
        self.var_roll = StringVar()
        self.var_gender = StringVar()
        self.var_dob = StringVar()   
        self.var_email = StringVar() 
        self.var_phone = StringVar()
        self.var_address = StringVar()
        self.var_teacher = StringVar()
        self.var_photo = StringVar()


        # first image
        img = Image.open(r"C:\Users\rajki\Desktop\New folder\image\download.jpg")
        img_w = self.screen_width // 3
        img = img.resize((img_w, 130), Image.LANCZOS)
        self.photoimg = ImageTk.PhotoImage(img)

        f_lbl = Label(self.root, image=self.photoimg)
        f_lbl.place(x=0, y=0, width=img_w, height=130)

         # second image
        img1 = Image.open(r"C:\Users\rajki\Desktop\New folder\image\images.jpg")
        img1 = img1.resize((img_w, 130), Image.LANCZOS)
        self.photoimg1 = ImageTk.PhotoImage(img1)

        f_lbl1 = Label(self.root, image=self.photoimg1)
        f_lbl1.place(x=img_w, y=0, width=img_w, height=130)

         # third image
        img2 = Image.open(r"C:\Users\rajki\Desktop\New folder\image\raj.jpg")
        img2 = img2.resize((img_w, 130), Image.LANCZOS)
        self.photoimg2 = ImageTk.PhotoImage(img2)

        f_lbl2 = Label(self.root, image=self.photoimg2)
        f_lbl2.place(x=img_w*2, y=0, width=img_w, height=130)

        # background image
        img3 = Image.open(r"C:\Users\rajki\Desktop\New folder\image\im.jpg")
        img3 = img3.resize((self.screen_width, self.screen_height - 130), Image.LANCZOS)
        self.photoimg3 = ImageTk.PhotoImage(img3) 

        bg_img = Label(self.root, image=self.photoimg3)      
        bg_img.place(x=0, y=130, width=self.screen_width, height=self.screen_height - 130)

        title_lbl = Label(bg_img, text="STUDENT MANAGEMENT SYSTEM", font=(
            "times new roman", 35, "bold"), bg="white", fg="darkgreen")
        title_lbl.place(x=0, y=0, width=self.screen_width, height=45)

        main_frame = Frame(bg_img, bd=2, bg="white")
        main_frame.place(x=5, y=55, width=self.screen_width, height=self.screen_height - 180)

        # left label frame
        Left_frame = LabelFrame(main_frame, bd=2, bg="white", relief=RIDGE, text="Student Details", font=(
            "times new roman", 12, "bold"))
        Left_frame.place(x=10, y=10, width=(self.screen_width // 2) - 20, height=self.screen_height - 210)

        img_left = Image.open(r"C:\Users\rajki\Desktop\New folder\image\stu.jpg")
        img_left = img_left.resize((720, 130), Image.LANCZOS)
        self.photoimg_left = ImageTk.PhotoImage(img_left)

        f_lbl_left = Label(Left_frame, image=self.photoimg_left)
        f_lbl_left.place(x=5, y=0, width=720, height=130)

        # current course
        current_course_label = LabelFrame(Left_frame,bd=2,bg="white",relief=RIDGE, text="Current Course:", font=(
            "times new roman", 12, "bold"))
        current_course_label.place(x=5, y=135 , width=720, height=90)

        #department
        department_label = Label( current_course_label, text="Department:", font=(
            "times new roman", 12, "bold"),bd=2, bg="white")
        department_label.grid(row=0, column=0, padx=10, pady=5)

        department_combo = ttk.Combobox( current_course_label,textvariable=self.var_dep, font=(
            "times new roman", 12, "bold"), width=17, state="readonly")
        department_combo["values"] = ("Select Department", "Computer Science", "Electrical Engineering", "Mechanical Engineering")
        department_combo.current(0)
        department_combo.grid(row=0, column=1, padx=10, pady=5)

        #course
        course_label = Label( current_course_label, text="Course:", font=(
            "times new roman", 12, "bold "),bd=2, bg="white")
        course_label.grid(row=0, column=2, padx=10, pady=5)

        course_combo = ttk.Combobox( current_course_label,textvariable=self.var_course, font=(
            "times new roman", 12, "bold"), width=17, state="readonly")
        course_combo["values"] = ("Select Course", "Bachelor of Computer Science", "Bachelor of Electrical Engineering", "Bachelor of Mechanical Engineering")
        course_combo.current(0)
        course_combo.grid(row=0, column=3, padx=10, pady=5)

        #year
        year_label = Label( current_course_label, text="Year:", font=(
            "times new roman", 12, "bold"),bd=2, bg="white")
        year_label.grid(row=1, column=0, padx=10, pady=5)

        year_combo = ttk.Combobox( current_course_label,textvariable=self.var_year, font=(
            "times new roman", 12, "bold"), width=17, state="readonly")
        year_combo["values"] = ("Select Year", "First Year", "Second Year", "Third Year", "Fourth Year")
        year_combo.current(0)
        year_combo.grid(row=1, column=1, padx=10, pady=5, sticky=W)

        #semester
        semester_label = Label( current_course_label, text="Semester:", font=(
            "times new roman", 12, "bold"),bd=2, bg="white")
        semester_label.grid(row=1, column=2, padx=10, pady=5)

        semester_combo = ttk.Combobox( current_course_label,textvariable=self.var_semester, font=(
            "times new roman", 12, "bold"), width=17, state="readonly")
        semester_combo["values"] = ("Select Semester", "First Semester", "Second Semester")
        semester_combo.current(0)
        semester_combo.grid(row=1, column=3, padx=10, pady=5, sticky=W)

        #class student information
        class_student_information_label = LabelFrame(Left_frame,bd=2,bg="white",relief=RIDGE, text="Class Student Information:", font=(
            "times new roman", 12, "bold"))
        class_student_information_label.place(x=5, y=230 , width=720, height=250)

        #student id
        studentid_label = Label(class_student_information_label, text="Student ID:", font=(
            "times new roman", 12, "bold"),bd=2, bg="white")
        studentid_label.grid(row=0, column=0, padx=10, pady=5)

        studentid_entry = ttk.Entry(class_student_information_label, font=(
            "times new roman", 12, "bold"), width=17, textvariable=self.var_id)
        studentid_entry.grid(row=0, column=1, padx=10, pady=5, sticky=W)

        #student name
        studentname_label = Label(class_student_information_label, text="Student Name:", font=(
            "times new roman", 12, "bold"),bd=2, bg="white")
        studentname_label.grid(row=0, column=2, padx=10, pady=5)

        studentname_entry = ttk.Entry(class_student_information_label, font=(
            "times new roman", 12, "bold"), width=17, textvariable=self.var_name)
        studentname_entry.grid(row=0, column=3, padx=10, pady=5, sticky=W)

        #class division
        class_div_label = Label(class_student_information_label, text="Class Division:", font=(
            "times new roman", 12, "bold"),bd=2, bg="white")
        class_div_label.grid(row=1, column=0, padx=10, pady=5)

        class_div_entry = ttk.Entry(class_student_information_label, font=(
            "times new roman", 12, "bold"), width=17, textvariable=self.var_div)
        class_div_entry.grid(row=1, column=1, padx=10, pady=5, sticky=W)

        #roll number
        roll_no_label = Label(class_student_information_label, text="Roll Number:", font=(
            "times new roman", 12, "bold"),bd=2, bg="white")
        roll_no_label.grid(row=1, column=2, padx=10, pady=5)

        roll_no_entry = ttk.Entry(class_student_information_label, font=(
            "times new roman", 12, "bold"), width=17, textvariable=self.var_roll)
        roll_no_entry.grid(row=1, column=3, padx=10, pady=5, sticky=W)

        #gender
        gender_label = Label(class_student_information_label, text="Gender:", font=(
            "times new roman", 12, "bold"),bd=2, bg="white")
        gender_label.grid(row=2, column=0, padx=10, pady=5)

        gender_combo = ttk.Combobox(class_student_information_label, font=(
            "times new roman", 12, "bold"), width=17, state="readonly", textvariable=self.var_gender)
        gender_combo["values"] = ("Select Gender", "Male", "Female", "Other")
        gender_combo.current(0)
        gender_combo.grid(row=2, column=1, padx=10, pady=5, sticky=W)

        #DOB
        dob_label = Label(class_student_information_label, text="DOB:", font=(
            "times new roman", 12, "bold"),bd=2, bg="white")
        dob_label.grid(row=2, column=2, padx=10, pady=5)

        dob_entry = ttk.Entry(class_student_information_label, font=(
            "times new roman", 12, "bold"), width=17, textvariable=self.var_dob)
        dob_entry.grid(row=2, column=3, padx=10, pady=5, sticky=W)

        #student email
        email_label = Label(class_student_information_label, text="Student Email:", font=(
            "times new roman", 12, "bold"),bd=2, bg="white")
        email_label.grid(row=3, column=0, padx=10, pady=5)

        email_entry = ttk.Entry(class_student_information_label, font=(
            "times new roman", 12, "bold"), width=17, textvariable=self.var_email)
        email_entry.grid(row=3, column=1, padx=10, pady=5, sticky=W)

        #student phone
        phone_label = Label(class_student_information_label, text="Student Phone:", font=(
            "times new roman", 12, "bold"),bd=2, bg="white")
        phone_label.grid(row=3, column=2, padx=10, pady=5)

        phone_entry = ttk.Entry(class_student_information_label, font=(
            "times new roman", 12, "bold"), width=17, textvariable=self.var_phone)
        phone_entry.grid(row=3, column=3, padx=10, pady=5, sticky=W)

        #address
        address_label = Label(class_student_information_label, text="Address :", font=(
            "times new roman", 12, "bold"),bd=2, bg="white")
        address_label.grid(row=4, column=0, padx=10, pady=5)

        address_entry = ttk.Entry(class_student_information_label, font=(
            "times new roman", 12, "bold"), width=17, textvariable=self.var_address)
        address_entry.grid(row=4, column=1, padx=10, pady=5, sticky=W)

        
        #teacher name
        teacher_label = Label(class_student_information_label, text="Teacher Name:", font=(
            "times new roman", 12, "bold"),bd=2, bg="white")
        teacher_label.grid(row=4, column=2, padx=10, pady=5)

        teacher_entry = ttk.Entry(class_student_information_label, font=(
            "times new roman", 12, "bold"), width=17, textvariable=self.var_teacher)
        teacher_entry.grid(row=4, column=3, padx=10, pady=5, sticky=W)

        #radio buttons
        self.var_photo.set("")
        radiobtn1 = Radiobutton(class_student_information_label, variable=self.var_photo, text="Take Photo Sample", value="yes", font=(
            "times new roman", 12, "bold"), bg="white")
        radiobtn1.grid(row=5, column=0, padx=10, pady=5)

        radiobtn2 = Radiobutton(class_student_information_label, variable=self.var_photo, text="No Photo Sample", value="no", font=(
            "times new roman", 12, "bold"), bg="white")
        radiobtn2.grid(row=5, column=1, padx=10, pady=5)

        #button frame
        btn_frame = Frame(Left_frame, bd=2, relief=RIDGE, bg="white")
        btn_frame.place(x=5, y=480, width=720, height=35)

        save_btn = Button(btn_frame, text="Save",command=self.add_data, font=(
            "times new roman", 13, "bold"), bg="blue", fg="white", width=17)
        save_btn.grid(row=0, column=0, )

        update_btn = Button(btn_frame, text="Update",command=self.update_data, font=(
            "times new roman", 13, "bold"), bg="blue", fg="white", width=17)
        update_btn.grid(row=0, column=1, )

        delete_btn = Button(btn_frame, text="Delete",command=self.delete_data, font=(
            "times new roman", 13, "bold"), bg="blue", fg="white", width=17)
        delete_btn.grid(row=0, column=2, )

        reset_btn = Button(btn_frame, text="Reset",command=self.reset_data, font=(
            "times new roman", 13, "bold"), bg="blue", fg="white", width=17)    
        reset_btn.grid(row=0, column=3, )

        btn_frame1 = Frame(Left_frame, bd=2, relief=RIDGE, bg="white")
        btn_frame1.place(x=5, y=515, width=720, height=70)

        take_photo_btn = Button(btn_frame1,command=self.generate_dataset, text="Take Photo Sample", font=(
            "times new roman", 13, "bold"), bg="blue", fg="white", width=36)
        take_photo_btn.grid(row=1, column=0,)

        update_photo_btn = Button(btn_frame1, text="Update Photo Sample", font=(
            "times new roman", 13, "bold"), bg="blue", fg="white", width=36)
        update_photo_btn.grid(row=1, column=1,)

        # right label frame
        Right_frame = LabelFrame(main_frame, bd=2, bg="white", relief=RIDGE, text="Student Details", font=(
            "times new roman", 12, "bold")) 
        Right_frame.place(x=(self.screen_width // 2) + 10, y=10, width=(self.screen_width // 2) - 20, height=self.screen_height - 210)

        img_right = Image.open(r"C:\Users\rajki\Desktop\New folder\image\stu.jpg")
        img_right = img_right.resize((720, 130), Image.LANCZOS)
        self.photoimg_right = ImageTk.PhotoImage(img_right)

        f_lbl_right = Label(Right_frame, image=self.photoimg_right)
        f_lbl_right.place(x=5, y=0, width=720, height=130)

        #search system
        search_frame = LabelFrame(Right_frame,bd=2, relief=RIDGE, text="Search System:", font=(
            "times new roman", 12, "bold"), bg="white")
        search_frame.place(x=5, y=135 , width=720, height=60)

        search_label = Label(search_frame, text="Search By:", font=(
            "times new roman", 15, "bold"), bg="red",fg="white")
        search_label.grid(row=0, column=0, pady=5,sticky=W )

        search_combo = ttk.Combobox(search_frame, font=(
            "times new roman", 12, "bold"), width=17, state="readonly")
        search_combo["values"] = ("Select Option", "Roll Number", "Phone Number", "Student ID")
        search_combo.current(0)
        search_combo.grid(row=0, column=1,padx=2,  pady=10, sticky=W)

        search_entry = ttk.Entry(search_frame, font=(
            "times new roman", 12, "bold"), width=17)
        search_entry.grid(row=0, column=2, padx=10, pady=5, sticky=W)

        search_btn = Button(search_frame, text="Search", font=(
            "times new roman", 12, "bold"), bg="blue", fg="white", width=10)
        search_btn.grid(row=0, column=3, padx=10, pady=5)

        showall_btn = Button(search_frame, text="Show All", font=(
            "times new roman", 12, "bold"), bg="blue", fg="white", width=10)
        showall_btn.grid(row=0, column=4, padx=10, pady=5)

        #table frame
        table_frame = Frame(Right_frame, bd=2, relief=RIDGE, bg="white")
        table_frame.place(x=5, y=210, width=720, height=350)

        scroll_x = ttk.Scrollbar(table_frame, orient=HORIZONTAL)
        scroll_y = ttk.Scrollbar(table_frame, orient=VERTICAL)
        self.student_table = ttk.Treeview(table_frame, column=(
            "dep", "course", "year", "sem", "id", "name", "div", "roll", "gender", "dob", "email", "phone", "address","teacher","photo"), xscrollcommand=scroll_x.set, yscrollcommand=scroll_y.set)
        
        scroll_x.pack(side=BOTTOM, fill=X)
        scroll_y.pack(side=RIGHT, fill=Y)
        scroll_x.config(command=self.student_table.xview)
        scroll_y.config(command=self.student_table.yview)

        self.student_table.heading("dep", text="Department")
        self.student_table.heading("course", text="Course")
        self.student_table.heading("year", text="Year")
        self.student_table.heading("sem", text="Semester")
        self.student_table.heading("id", text="Student ID")
        self.student_table.heading("name", text="Name")
        self.student_table.heading("div", text="Division")
        self.student_table.heading("roll", text="Roll Number")
        self.student_table.heading("gender", text="Gender")
        self.student_table.heading("dob", text="DOB")
        self.student_table.heading("email", text="Email")
        self.student_table.heading("phone", text="Phone NUmber")
        self.student_table.heading("address", text="Address")
        self.student_table.heading("teacher", text="Teacher Name")
        self.student_table.heading("photo", text="photosample status")
        self.student_table["show"] = "headings"

        self.student_table.column("dep", width=100)
        self.student_table.column("course", width=100)
        self.student_table.column("year", width=100)
        self.student_table.column("sem", width=100)
        self.student_table.column("id", width=100)
        self.student_table.column("name", width=100)
        self.student_table.column("div", width=100)
        self.student_table.column("roll", width=100)
        self.student_table.column("gender", width=100)
        self.student_table.column("dob", width=100)
        self.student_table.column("email", width=100)
        self.student_table.column("phone", width=100)
        self.student_table.column("address", width=100)
        self.student_table.column("teacher", width=100)
        self.student_table.column("photo", width=100)

        self.student_table.pack(fill=BOTH, expand=1)
        self.student_table.bind("<ButtonRelease>", self.get_cursor)
        self.fetch_data()

    #function declaration
    def add_data(self):
        if self.var_dep.get() == "Select Department" or self.var_course.get() == "Select Course" or self.var_year.get() == "Select Year" or self.var_semester.get() == "Select Semester" or self.var_id.get() == "" or self.var_name.get() == ""or self.var_div.get() == "" or self.var_roll.get() =="" or self.var_gender.get() == "Select Gender"or self.var_dob.get() == "" or self.var_email.get() == "" or self.var_phone.get() == "" or self.var_address.get() == ""  or self.var_teacher.get() == "":
            messagebox.showerror("Error", "All fields are required", parent=self.root)
        else:
            try:
                conn=get_db_connection()
                my_cursor=conn.cursor()
                my_cursor.execute(
                    "INSERT INTO student (`dep`, `course`, `year`, `semester`, `id`, `name`, `div`, `roll`, `gender`, `dob`, `email`, `phone`, `address`, `teacher`, `photo`) "
                    "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)", (
                    self.var_dep.get(),
                    self.var_course.get(),
                    self.var_year.get(),
                    self.var_semester.get(),
                    self.var_id.get(),
                    self.var_name.get(),
                    self.var_div.get(),
                    self.var_roll.get(),
                    self.var_gender.get(),
                    self.var_dob.get(),
                    self.var_email.get(),
                    self.var_phone.get(),
                    self.var_address.get(),
                    self.var_teacher.get(),
                    self.var_photo.get()

                ))
                conn.commit()
                self.fetch_data()
                conn.close()
                messagebox.showinfo("Success", "Student details has been added successfully", parent=self.root)
            except Exception as es:
                messagebox.showerror("Error", f"Due to: {str(es)}", parent=self.root)

    #fetch data
    def fetch_data(self):
        conn=get_db_connection()
        my_cursor=conn.cursor()
        my_cursor.execute("select `dep`, `course`, `year`, `semester`, `id`, `name`, `div`, `roll`, `gender`, `dob`, `email`, `phone`, `address`, `teacher`, `photo` from student")
        data=my_cursor.fetchall()

        if len(data) != 0:
            self.student_table.delete(*self.student_table.get_children())
            for i in data:
                self.student_table.insert("", END, values=i)
            conn.commit()
        conn.close()

    #get cursor
    def get_cursor(self, event=""):
        cursor_focus = self.student_table.focus()
        content = self.student_table.item(cursor_focus)
        data = content["values"]

        self.var_dep.set(data[0])
        self.var_course.set(data[1])
        self.var_year.set(data[2])
        self.var_semester.set(data[3])
        self.var_id.set(data[4])
        self.var_name.set(data[5])
        self.var_div.set(data[6])
        self.var_roll.set(data[7])
        self.var_gender.set(data[8])
        self.var_dob.set(data[9])
        self.var_email.set(data[10]) 
        self.var_phone.set(data[11])
        self.var_address.set(data[12])
        self.var_teacher.set(data[13])
        self.var_photo.set(data[14])

    #update function
    def update_data(self):
        if self.var_dep.get() == "Select Department" or self.var_course.get() == "Select Course" or self.var_year.get() == "Select Year" or self.var_semester.get() == "Select Semester" or self.var_id.get() == "" or self.var_name.get() == ""or self.var_div.get() == "" or self.var_roll.get() =="" or self.var_gender.get() == "Select Gender"or self.var_dob.get() == "" or self.var_email.get() == "" or self.var_phone.get() == "" or self.var_address.get() == "" or self.var_teacher.get() == "":


            messagebox.showerror("Error", "All fields are required", parent=self.root)
        else:
            try:
                Update = messagebox.askyesno("Update", "Do you want to update this student details?", parent=self.root)
                if Update > 0:
                    conn=get_db_connection()
                    my_cursor=conn.cursor()
                    print("UPDATE BUTTON CLICKED")
                    print("ID =", self.var_id.get())
                    my_cursor.execute( "UPDATE student SET `dep`=%s, `course`=%s, `year`=%s, `semester`=%s, `name`=%s, `div`=%s, `roll`=%s, `gender`=%s, `dob`=%s, `email`=%s, `phone`=%s, `address`=%s, `teacher`=%s, `photo`=%s WHERE `id`=%s",(
                        self.var_dep.get(),
                        self.var_course.get(),
                        self.var_year.get(),
                        self.var_semester.get(),
                        self.var_name.get(),
                        self.var_div.get(),
                        self.var_roll.get(),
                        self.var_gender.get(),
                        self.var_dob.get(),
                        self.var_email.get(),
                        self.var_phone.get(),
                        self.var_address.get(),
                        self.var_teacher.get(),
                        self.var_photo.get(),
                        self.var_id.get()
                    ))
                else:
                    if not Update:
                        return    
                messagebox.showinfo("Success", "Student details successfully updated", parent=self.root)   
                conn.commit()
                self.fetch_data()   
                conn.close()
            except Exception as es:
                messagebox.showerror("Error", f"Due to: {str(es)}", parent=self.root) 

    #delete data
    def delete_data(self):
        if self.var_id.get() == "":
            messagebox.showerror("Error", "Student ID must be required", parent=self.root)
        else:
            try:
                delete = messagebox.askyesno("Delete", "Do you want to delete this student details?", parent=self.root)
                if delete > 0:
                    conn=get_db_connection()
                    my_cursor=conn.cursor()
                    sql = "delete from student where id=%s"
                    val = (self.var_id.get(),)
                    my_cursor.execute(sql, val)
                else:
                    if not delete:
                        return    
                conn.commit()
                self.fetch_data()   
                conn.close()
                messagebox.showinfo("Delete", "Student details successfully deleted", parent=self.root) 
            except Exception as es:
                messagebox.showerror("Error", f"Due to: {str(es)}", parent=self.root)  

    #reset data
    def reset_data(self):
        self.var_dep.set("Select Department")
        self.var_course.set("Select Course")
        self.var_year.set("Select Year")
        self.var_semester.set("Select Semester")
        self.var_id.set("")
        self.var_name.set("")
        self.var_div.set("")
        self.var_roll.set("")
        self.var_gender.set("Select Gender")
        self.var_dob.set("")
        self.var_email.set("")
        self.var_phone.set("")
        self.var_address.set("")
        self.var_teacher.set("")
        self.var_photo.set("")

    #generate data set or take photo samples using YuNet and SFace
    def generate_dataset(self):
        if self.var_dep.get() == "Select Department" or self.var_course.get() == "Select Course" or self.var_year.get() == "Select Year" or self.var_semester.get() == "Select Semester" or self.var_id.get() == "" or self.var_name.get() == "" or self.var_email.get() == "" or self.var_phone.get() == "" or self.var_div.get() == "" or self.var_gender.get() == "Select Gender" or self.var_roll.get() == "" or self.var_teacher.get() == "":
            messagebox.showerror("Error", "All fields are required", parent=self.root)  
        else:
            try:
                # First update basic details in database
                conn = get_db_connection()
                my_cursor = conn.cursor()
                my_cursor.execute("update student set `dep`=%s, `course`=%s, `year`=%s, `semester`=%s, `name`=%s, `div`=%s, `roll`=%s, `gender`=%s, `dob`=%s, `email`=%s, `phone`=%s, `address`=%s, `teacher`=%s where `id`=%s", (
                    self.var_dep.get(),
                    self.var_course.get(),
                    self.var_year.get(),
                    self.var_semester.get(),
                    self.var_name.get(),
                    self.var_div.get(),
                    self.var_roll.get(),
                    self.var_gender.get(),
                    self.var_dob.get(),
                    self.var_email.get(),
                    self.var_phone.get(),
                    self.var_address.get(),
                    self.var_teacher.get(),
                    self.var_id.get()
                ))
                conn.commit()
                conn.close()

                student_id = self.var_id.get()

                # Load YuNet detector and SFace recognizer
                try:
                    detector, recognizer = get_face_engines()
                except Exception as model_err:
                    messagebox.showerror("Model Error", f"Failed to load Deep Learning models:\n{model_err}", parent=self.root)
                    return

                cap, camera_index = open_camera()
                if cap is None:
                    messagebox.showerror(
                        "Error",
                        "External or internal camera could not be opened.",
                        parent=self.root,
                    )
                    return
                print(f"Using camera index for registration: {camera_index}")

                embeddings = []
                reference_crop = None
                
                # We will collect 10 high-quality frames where a face is detected
                required_samples = 10
                
                cv2.namedWindow("Registering Face Credentials", cv2.WINDOW_NORMAL)
                cv2.resizeWindow("Registering Face Credentials", 800, 600)

                while len(embeddings) < required_samples:
                    ret, frame = cap.read()
                    if not ret or frame is None:
                        continue
                    
                    frame = cv2.flip(frame, 1)
                    h, w = frame.shape[:2]
                    detector.setInputSize((w, h))

                    # Detect faces
                    retval, faces = detector.detect(frame)
                    
                    # Draw visual feedback
                    display_frame = frame.copy()
                    
                    # Visual header text
                    cv2.putText(display_frame, f"Deep Enrollment: {len(embeddings)}/{required_samples} samples collected", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2, cv2.LINE_AA)
                    cv2.putText(display_frame, "Please look straight at the camera and remain steady.", (20, h - 30), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1, cv2.LINE_AA)

                    if retval and faces is not None and len(faces) > 0:
                        # Take the face with the highest confidence
                        best_face_idx = 0
                        if len(faces) > 1:
                            best_face_idx = np.argmax(faces[:, 14])
                        
                        face = faces[best_face_idx]
                        x, y, box_w, box_h = face[0:4]
                        
                        # Draw bounding box
                        cv2.rectangle(display_frame, (int(x), int(y)), (int(x + box_w), int(y + box_h)), (0, 255, 0), 2, lineType=cv2.LINE_AA)
                        
                        try:
                            # Align and crop the face using SFace
                            aligned_face = recognizer.alignCrop(frame, face)
                            # Extract embedding
                            feat = recognizer.feature(aligned_face) # shape: (1, 128)
                            
                            if feat is not None:
                                embeddings.append(feat[0])
                                # Keep the first successful crop as the reference photo
                                if reference_crop is None:
                                    reference_crop = aligned_face
                                cv2.imshow("Cropped Face Sample", aligned_face)
                        except Exception as extract_err:
                            print(f"Embedding extraction failed: {extract_err}")

                    cv2.imshow("Registering Face Credentials", display_frame)
                    
                    key = cv2.waitKey(1)
                    if key == 13 or key == 27: # Enter or Esc to cancel
                        break

                cap.release()
                cv2.destroyAllWindows()

                if len(embeddings) < required_samples:
                    messagebox.showwarning("Warning", "Face registration was cancelled or insufficient samples were collected.", parent=self.root)
                    return

                # Compute the average embedding to reduce noise
                import json
                avg_embedding = np.mean(embeddings, axis=0)
                # Normalize the average embedding vector
                norm = np.linalg.norm(avg_embedding)
                if norm > 0:
                    avg_embedding = avg_embedding / norm
                
                embedding_json = json.dumps(avg_embedding.tolist())

                # Update database with embedding and photo status
                conn = get_db_connection()
                my_cursor = conn.cursor()
                my_cursor.execute("update student set `face_embedding`=%s, `photo`='yes' where `id`=%s", (
                    embedding_json,
                    student_id
                ))
                conn.commit()
                conn.close()

                # Save reference photo crop
                if reference_crop is not None:
                    base_dir = os.path.dirname(os.path.abspath(__file__))
                    data_dir = os.path.join(base_dir, "data")
                    os.makedirs(data_dir, exist_ok=True)
                    file_name_path = os.path.join(data_dir, f"user.{student_id}.1.jpg")
                    cv2.imwrite(file_name_path, reference_crop)

                self.var_photo.set("yes")
                self.fetch_data()
                messagebox.showinfo("Result", "Face credentials successfully registered using SFace Deep Learning! No training required.", parent=self.root)

            except Exception as es:
                messagebox.showerror("Error", f"Due to: {str(es)}", parent=self.root) 

if __name__ == "__main__":
    root = Tk()
    obj = Student(root)
    root.mainloop()        
