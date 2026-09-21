import os
from  tkinter import *
from tkinter import ttk
from tkinter import messagebox
from PIL import Image, ImageTk
from tkinter import messagebox
import mysql.connector
import cv2
import numpy as np
from face_utils import (
    open_camera, preprocess_face, get_db_connection, get_face_engines,
    setup_standard_window,
    make_card,
    make_button,
    make_section_label,
    make_status_chip,
    style_button,
    UI_BG, UI_SURFACE, UI_SURFACE_ALT, UI_PRIMARY, UI_ACCENT,
    UI_TEXT, UI_TEXT_MUTED, UI_SUCCESS, UI_DANGER, UI_INFO, UI_WARNING,
    UI_PAD, UI_PAD_LG, UI_PAD_SM,
    UI_FONT_HEADING, UI_FONT_SUBTITLE, UI_FONT_BODY, UI_FONT_LABEL,
)

class Student:
    def __init__(self, root):
        self.root = root

        # ── Variables (unchanged) ──────────────────────────────────────
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
        self.var_photo.set("")

        # ── Theme bootstrap ─────────────────────────────────────────────
        content = setup_standard_window(
            root,
            "Student Management",
            subtitle_text="Enrollment  •  Profiles  •  Face Registration  •  Search"
        )

        # ── Main split: Left (Form) | Right (Search + Table) ───────────
        split = Frame(content, bg=UI_BG)
        split.pack(fill="both", expand=True)

        # ═══════════════════  LEFT COLUMN  ══════════════════════════════
        left_wrap = Frame(split, bg=UI_BG)
        left_wrap.pack(side="left", fill="both", expand=True, padx=(0, UI_PAD_LG))

        # Use canvas + scrollbar on the left so the form never clips
        left_canvas = Canvas(left_wrap, bg=UI_BG, highlightthickness=0)
        left_scroll = ttk.Scrollbar(left_wrap, orient="vertical", command=left_canvas.yview)
        left_inner = Frame(left_canvas, bg=UI_BG)
        left_inner.bind("<Configure>",
                        lambda e: left_canvas.configure(scrollregion=left_canvas.bbox("all")))
        left_canvas.create_window((0, 0), window=left_inner, anchor="nw")
        left_canvas.configure(yscrollcommand=left_scroll.set)
        left_canvas.pack(side="left", fill="both", expand=True)
        left_scroll.pack(side="right", fill="y")

        # --- Course / Enrollment card ---
        course_card = make_card(left_inner, padx=UI_PAD_LG, pady=UI_PAD_LG)
        course_card.pack(fill="x", pady=(0, UI_PAD_LG))
        cc = course_card._inner

        course_hdr = make_section_label(cc, "Current Course", color=UI_PRIMARY)
        course_hdr.pack(anchor="w", pady=(0, UI_PAD))

        course_grid = Frame(cc, bg=UI_SURFACE)
        course_grid.pack(fill="x")

        def grid_field(row, col, label, widget):
            lbl = Label(course_grid, text=label, font=UI_FONT_LABEL,
                        bg=UI_SURFACE, fg=UI_TEXT_MUTED)
            lbl.grid(row=row, column=col * 2, padx=(0, UI_PAD_SM), pady=(UI_PAD_SM, 0), sticky="w")
            widget.grid(row=row, column=col * 2 + 1, pady=(UI_PAD_SM, 0), sticky="we")
            course_grid.grid_columnconfigure(col * 2 + 1, weight=1)

        department_combo = ttk.Combobox(course_grid, textvariable=self.var_dep,
                                        state="readonly", font=UI_FONT_BODY)
        department_combo["values"] = (
            "Select Department",
            "Computer Science",
            "Electrical Engineering",
            "Mechanical Engineering",
        )
        department_combo.current(0)
        grid_field(0, 0, "Department", department_combo)

        course_combo = ttk.Combobox(course_grid, textvariable=self.var_course,
                                    state="readonly", font=UI_FONT_BODY)
        course_combo["values"] = (
            "Select Course",
            "Bachelor of Computer Science",
            "Bachelor of Electrical Engineering",
            "Bachelor of Mechanical Engineering",
        )
        course_combo.current(0)
        grid_field(0, 1, "Course", course_combo)

        year_combo = ttk.Combobox(course_grid, textvariable=self.var_year,
                                  state="readonly", font=UI_FONT_BODY)
        year_combo["values"] = (
            "Select Year", "First Year", "Second Year", "Third Year", "Fourth Year"
        )
        year_combo.current(0)
        grid_field(1, 0, "Year", year_combo)

        semester_combo = ttk.Combobox(course_grid, textvariable=self.var_semester,
                                      state="readonly", font=UI_FONT_BODY)
        semester_combo["values"] = ("Select Semester", "First Semester", "Second Semester")
        semester_combo.current(0)
        grid_field(1, 1, "Semester", semester_combo)

        # --- Student info card ---
        info_card = make_card(left_inner, padx=UI_PAD_LG, pady=UI_PAD_LG)
        info_card.pack(fill="x", pady=(0, UI_PAD_LG))
        ic = info_card._inner

        info_hdr = make_section_label(ic, "Student Information", color=UI_PRIMARY)
        info_hdr.pack(anchor="w", pady=(0, UI_PAD))

        info_grid = Frame(ic, bg=UI_SURFACE)
        info_grid.pack(fill="x")

        def info_field(row, col, label, widget):
            lbl = Label(info_grid, text=label, font=UI_FONT_LABEL,
                        bg=UI_SURFACE, fg=UI_TEXT_MUTED)
            lbl.grid(row=row, column=col * 2, padx=(0, UI_PAD_SM), pady=(UI_PAD_SM, 0), sticky="w")
            widget.grid(row=row, column=col * 2 + 1, pady=(UI_PAD_SM, 0), sticky="we")
            info_grid.grid_columnconfigure(col * 2 + 1, weight=1)

        studentid_entry = ttk.Entry(info_grid, textvariable=self.var_id, font=UI_FONT_BODY)
        info_field(0, 0, "Student ID", studentid_entry)

        studentname_entry = ttk.Entry(info_grid, textvariable=self.var_name, font=UI_FONT_BODY)
        info_field(0, 1, "Student Name", studentname_entry)

        class_div_entry = ttk.Entry(info_grid, textvariable=self.var_div, font=UI_FONT_BODY)
        info_field(1, 0, "Class Division", class_div_entry)

        roll_no_entry = ttk.Entry(info_grid, textvariable=self.var_roll, font=UI_FONT_BODY)
        info_field(1, 1, "Roll Number", roll_no_entry)

        gender_combo = ttk.Combobox(info_grid, state="readonly",
                                    textvariable=self.var_gender, font=UI_FONT_BODY)
        gender_combo["values"] = ("Select Gender", "Male", "Female", "Other")
        gender_combo.current(0)
        info_field(2, 0, "Gender", gender_combo)

        dob_entry = ttk.Entry(info_grid, textvariable=self.var_dob, font=UI_FONT_BODY)
        info_field(2, 1, "Date of Birth", dob_entry)

        email_entry = ttk.Entry(info_grid, textvariable=self.var_email, font=UI_FONT_BODY)
        info_field(3, 0, "Email Address", email_entry)

        phone_entry = ttk.Entry(info_grid, textvariable=self.var_phone, font=UI_FONT_BODY)
        info_field(3, 1, "Phone Number", phone_entry)

        address_entry = ttk.Entry(info_grid, textvariable=self.var_address, font=UI_FONT_BODY)
        info_field(4, 0, "Address", address_entry)

        teacher_entry = ttk.Entry(info_grid, textvariable=self.var_teacher, font=UI_FONT_BODY)
        info_field(4, 1, "Teacher Name", teacher_entry)

        # Photo sample radio row
        radio_row = Label(ic, text="Photo Sample Status", font=UI_FONT_LABEL,
                          bg=UI_SURFACE, fg=UI_TEXT_MUTED)
        radio_row.pack(anchor="w", pady=(UI_PAD_LG, UI_PAD_SM))

        r_frame = Frame(ic, bg=UI_SURFACE)
        r_frame.pack(fill="x")

        radiobtn1 = Radiobutton(r_frame, variable=self.var_photo,
                                text="Take Photo Sample", value="yes",
                                font=UI_FONT_BODY, bg=UI_SURFACE, fg=UI_TEXT,
                                activebackground=UI_SURFACE, selectcolor=UI_SURFACE)
        radiobtn1.pack(side="left", padx=(0, UI_PAD_LG))

        radiobtn2 = Radiobutton(r_frame, variable=self.var_photo,
                                text="No Photo Sample", value="no",
                                font=UI_FONT_BODY, bg=UI_SURFACE, fg=UI_TEXT,
                                activebackground=UI_SURFACE, selectcolor=UI_SURFACE)
        radiobtn2.pack(side="left")

        # --- CRUD Buttons card ---
        btns_card = make_card(left_inner, padx=UI_PAD_LG, pady=UI_PAD_LG)
        btns_card.pack(fill="x", pady=(0, UI_PAD_LG))
        bc = btns_card._inner

        btns_hdr = make_section_label(bc, "Record Actions", color=UI_TEXT)
        btns_hdr.pack(anchor="w", pady=(0, UI_PAD))

        row1 = Frame(bc, bg=UI_SURFACE)
        row1.pack(fill="x", pady=(0, UI_PAD_SM))

        save_btn = make_button(row1, "💾  Save", command=self.add_data, variant="primary")
        save_btn.pack(side="left", padx=(0, UI_PAD_SM), fill="x", expand=True)

        update_btn = make_button(row1, "✏️  Update", command=self.update_data, variant="success")
        update_btn.pack(side="left", padx=(0, UI_PAD_SM), fill="x", expand=True)

        delete_btn = make_button(row1, "🗑️  Delete", command=self.delete_data, variant="danger")
        delete_btn.pack(side="left", padx=(0, UI_PAD_SM), fill="x", expand=True)

        reset_btn = make_button(row1, "↺  Reset", command=self.reset_data, variant="ghost")
        reset_btn.pack(side="left", fill="x", expand=True)

        # --- Face enrollment card ---
        face_card = make_card(left_inner, padx=UI_PAD_LG, pady=UI_PAD_LG)
        face_card.pack(fill="x")
        fc = face_card._inner

        face_hdr = make_section_label(fc, "Biometric Enrollment", color=UI_PRIMARY)
        face_hdr.pack(anchor="w", pady=(0, UI_PAD_SM))

        face_desc = Label(
            fc,
            text="Launches your webcam, captures 10 high-quality frames, extracts SFace 128-D embeddings, and saves them to the student record.",
            font=UI_FONT_BODY, bg=UI_SURFACE, fg=UI_TEXT_MUTED, wraplength=500, justify="left"
        )
        face_desc.pack(anchor="w", pady=(0, UI_PAD))

        chips = Frame(fc, bg=UI_SURFACE)
        chips.pack(anchor="w", pady=(0, UI_PAD))
        make_status_chip(chips, " 10 Samples ", "info").pack(side="left", padx=(0, UI_PAD_SM))
        make_status_chip(chips, " SFace Deep-Learning ", "success").pack(side="left", padx=(0, UI_PAD_SM))
        make_status_chip(chips, " YuNet Detector ", "loading").pack(side="left")

        row2 = Frame(fc, bg=UI_SURFACE)
        row2.pack(fill="x")

        take_photo_btn = make_button(row2, "📸  Take Photo Sample",
                                     command=self.generate_dataset, variant="primary")
        take_photo_btn.pack(side="left", padx=(0, UI_PAD_SM), fill="x", expand=True)

        update_photo_btn = make_button(row2, "🔁  Update Photo Sample", variant="secondary")
        update_photo_btn.pack(side="left", fill="x", expand=True)

        # ═══════════════════  RIGHT COLUMN  ═════════════════════════════
        right_wrap = Frame(split, bg=UI_BG)
        right_wrap.pack(side="left", fill="both", expand=True, padx=(UI_PAD_LG, 0))

        # --- Search card ---
        search_card = make_card(right_wrap, padx=UI_PAD_LG, pady=UI_PAD_LG)
        search_card.pack(fill="x", pady=(0, UI_PAD_LG))
        sc = search_card._inner

        search_hdr = make_section_label(sc, "Search & Filter", color=UI_PRIMARY)
        search_hdr.pack(anchor="w", pady=(0, UI_PAD))

        search_row = Frame(sc, bg=UI_SURFACE)
        search_row.pack(fill="x")

        Label(search_row, text="Search By:", font=UI_FONT_LABEL,
              bg=UI_SURFACE, fg=UI_TEXT_MUTED).pack(side="left", padx=(0, UI_PAD_SM))

        search_combo = ttk.Combobox(search_row, state="readonly",
                                    width=18, font=UI_FONT_BODY)
        search_combo["values"] = ("Select Option", "Roll Number", "Phone Number", "Student ID")
        search_combo.current(0)
        search_combo.pack(side="left", padx=(0, UI_PAD_SM))

        search_entry = ttk.Entry(search_row, width=22, font=UI_FONT_BODY)
        search_entry.pack(side="left", padx=(0, UI_PAD_SM))

        search_btn = make_button(search_row, "🔍  Search", variant="primary")
        search_btn.pack(side="left", padx=(0, UI_PAD_SM))

        showall_btn = make_button(search_row, "⤴  Show All", variant="secondary")
        showall_btn.pack(side="left")

        # --- Table card ---
        table_card = make_card(right_wrap, padx=UI_PAD, pady=UI_PAD)
        table_card.pack(fill="both", expand=True)
        tc_inner = table_card._inner

        table_hdr_row = Frame(tc_inner, bg=UI_SURFACE)
        table_hdr_row.pack(fill="x", pady=(0, UI_PAD_SM))

        table_hdr = make_section_label(table_hdr_row, "Enrolled Students", color=UI_TEXT)
        table_hdr.pack(side="left", anchor="w")

        count_hint = Label(
            table_hdr_row,
            text="Click a row to auto-fill the form on the left  •  Scroll to view all 15 columns",
            font=("Segoe UI", 9, "normal"),
            bg=UI_SURFACE, fg=UI_TEXT_MUTED
        )
        count_hint.pack(side="right", anchor="e")

        tv_container = Frame(tc_inner, bg=UI_SURFACE,
                             highlightbackground=UI_BORDER, highlightthickness=1)
        tv_container.pack(fill="both", expand=True)

        scroll_x = ttk.Scrollbar(tv_container, orient=HORIZONTAL)
        scroll_y = ttk.Scrollbar(tv_container, orient=VERTICAL)

        self.student_table = ttk.Treeview(
            tv_container,
            column=("dep", "course", "year", "sem", "id", "name", "div",
                    "roll", "gender", "dob", "email", "phone",
                    "address", "teacher", "photo"),
            xscrollcommand=scroll_x.set, yscrollcommand=scroll_y.set
        )

        scroll_x.pack(side=BOTTOM, fill=X)
        scroll_y.pack(side=RIGHT, fill=Y)
        scroll_x.config(command=self.student_table.xview)
        scroll_y.config(command=self.student_table.yview)

        col_defs = [
            ("dep",     "Department",   120),
            ("course",  "Course",       140),
            ("year",    "Year",         90),
            ("sem",     "Semester",     100),
            ("id",      "Student ID",   90),
            ("name",    "Name",         140),
            ("div",     "Division",     80),
            ("roll",    "Roll Number",  100),
            ("gender",  "Gender",       70),
            ("dob",     "DOB",          90),
            ("email",   "Email",        160),
            ("phone",   "Phone",        110),
            ("address", "Address",      140),
            ("teacher", "Teacher",      120),
            ("photo",   "Photo Status", 100),
        ]
        for key, label, width in col_defs:
            self.student_table.heading(key, text=label)
            self.student_table.column(key, width=width, anchor="w")

        self.student_table["show"] = "headings"
        self.student_table.pack(fill=BOTH, expand=True)

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
