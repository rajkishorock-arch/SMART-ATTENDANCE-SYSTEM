import os
from  tkinter import *
from tkinter import ttk
from tkinter import messagebox, filedialog
from PIL import Image, ImageTk
import mysql.connector
import cv2
import csv

mydata = []
class Attendence:
    def __init__(self, root):
        self.root = root
        self.root.geometry("1530x790+0+0")
        self.root.title("Face Recognition System")

        #first image
        img_top = Image.open(r"C:\Users\rajki\Desktop\New folder\image\atten.jpg")
        img_top = img_top.resize((800, 200), Image.LANCZOS)
        self.photoimg_top = ImageTk.PhotoImage(img_top) 

        f_lbl = Label(self.root, image=self.photoimg_top)      
        f_lbl.place(x=0, y=0, width=800, height=200)

        #second image
        img_bottom = Image.open(r"C:\Users\rajki\Desktop\New folder\image\at.jpg")
        img_bottom = img_bottom.resize((800, 200), Image.LANCZOS)
        self.photoimg_bottom = ImageTk.PhotoImage(img_bottom)

        f_lbl = Label(self.root, image=self.photoimg_bottom)
        f_lbl.place(x=800, y=0, width=800, height=200)

        #bg image
        img3 = Image.open(r"C:\Users\rajki\Desktop\New folder\image\at2.jpg")
        img3 = img3.resize((1530, 790), Image.LANCZOS)
        self.photoimg3 = ImageTk.PhotoImage(img3)

        bg_img = Label(self.root, image=self.photoimg3)
        bg_img.place(x=0, y=200, width=1530, height=790)

        title_lbl=Label(bg_img,text="ATTENDANCE  MANAGEMENT SYSTEM",font=("times new roman",35,"bold"),bg="white",fg="green")
        title_lbl.place(x=0,y=0,width=1530,height=45)

        #main frame
        main_frame = Frame(bg_img,bd=2,bg="white")
        main_frame.place(x=20,y=55,width=1480,height=600)

        #left label frame
        Left_frame = LabelFrame(main_frame,bd=2,bg="white",relief=RIDGE,text="Attendence",font=("times new roman",12,"bold"))
        Left_frame.place(x=10,y=10,width=730,height=580)

        image_left = Image.open(r"C:\Users\rajki\Desktop\New folder\image\atten.jpg")
        image_left = image_left.resize((720, 130), Image.LANCZOS)
        self.photoimage_left = ImageTk.PhotoImage(image_left)

        f_lbl = Label(Left_frame, image=self.photoimage_left)
        f_lbl.place(x=5, y=0, width=720, height=130)

        #left inside frame
        left_inside_frame = Frame(Left_frame,bd=2,bg="white",relief=RIDGE)
        left_inside_frame.place(x=5,y=135,width=720,height=430)

        #label entry
        AttendenceId_label = Label(left_inside_frame,text="Attendence ID:",font=("times new roman",13,"bold"),bg="white")
        AttendenceId_label.grid(row=0,column=0,padx=10,pady=5,sticky=W)

        self.AttendenceId_entry = ttk.Entry(left_inside_frame,width=20,font=("times new roman",13,"bold"))
        self.AttendenceId_entry.grid(row=0,column=1,padx=10,pady=5,sticky=W)

        #roll
        roll_label = Label(left_inside_frame,text="Roll:",font=("times new roman",13,"bold"),bg="white")
        roll_label.grid(row=0,column=2,padx=10,pady=5,sticky=W)

        self.roll_entry = ttk.Entry(left_inside_frame,width=20,font=("times new roman",13,"bold"))
        self.roll_entry.grid(row=0,column=3,padx=10,pady=5,sticky=W)

        #name
        name_label = Label(left_inside_frame,text="Name:",font=("times new roman",13,"bold"),bg="white")
        name_label.grid(row=1,column=0,padx=10,pady=5,sticky=W)

        self.name_entry = ttk.Entry(left_inside_frame,width=20,font=("times new roman",13,"bold"))
        self.name_entry.grid(row=1,column=1,padx=10,pady=5,sticky=W)

        #department
        dep_label = Label(left_inside_frame,text="Department:",font=("times new roman",13,"bold"),bg="white")
        dep_label.grid(row=1,column=2,padx=10,pady=5,sticky=W)

        self.dep_entry = ttk.Entry(left_inside_frame,width=20,font=("times new roman",13,"bold"))
        self.dep_entry.grid(row=1,column=3,padx=10,pady=5,sticky=W)

        #time
        time_label = Label(left_inside_frame,text="Time:",font=("times new roman",13,"bold"),bg="white")
        time_label.grid(row=2,column=0,padx=10,pady=5,sticky=W)

        self.time_entry = ttk.Entry(left_inside_frame,width=20,font=("times new roman",13,"bold"))
        self.time_entry.grid(row=2,column=1,padx=10,pady=5,sticky=W)

        #date
        date_label = Label(left_inside_frame,text="Date:",font=("times new roman",13,"bold"),bg="white")
        date_label.grid(row=2,column=2,padx=10,pady=5,sticky=W)

        self.date_entry = ttk.Entry(left_inside_frame,width=20,font=("times new roman",13,"bold"))
        self.date_entry.grid(row=2,column=3,padx=10,pady=5,sticky=W)

        #attendance
        attendance_label = Label(left_inside_frame,text="Attendance:",font=("times new roman",13,"bold"),bg="white")
        attendance_label.grid(row=3,column=0,padx=10,pady=5,sticky=W)

        self.atten_status=ttk.Combobox(left_inside_frame,width=20,font=("times new roman",13,"bold"),state="readonly")
        self.atten_status["values"]=("Present","Absent")
        self.atten_status.grid(row=3,column=1,padx=10,pady=5,sticky=W)
        self.atten_status.current(0)

        #buttons frame
        btn_frame = Frame(left_inside_frame,bd=2,bg="white",relief=RIDGE)
        btn_frame.place(x=0,y=300,width=715,height=35)

        #import csv
        import_btn = Button(btn_frame,text="Import CSV",command=self.importCsv,width=17,font=("times new roman",13,"bold"),fg="white",bg="green")
        import_btn.grid(row=0,column=0)

        #export csv
        export_btn = Button(btn_frame,text="Export CSV",command=self.exportCsv,width=17,font=("times new roman",13,"bold"),fg="white",bg="green")
        export_btn.grid(row=0,column=1)

        #save to database
        save_btn = Button(btn_frame,text="Save",command=self.saveData,width=17,font=("times new roman",13,"bold"),fg="white",bg="green")
        save_btn.grid(row=0,column=2)

        #update
        update_btn = Button(btn_frame,text="Update",command=self.updateData,width=17,font=("times new roman",13,"bold"),fg="white",bg="green")
        update_btn.grid(row=0,column=3)

        #reset
        reset_btn = Button(btn_frame,text="Reset",command=self.reset,width=17,font=("times new roman",13,"bold"),fg="white",bg="green")
        reset_btn.grid(row=0,column=4)
        


        #right frame
        Right_frame = LabelFrame(main_frame,bd=2,bg="white",relief=RIDGE,text="Attendence Details",font=("times new roman",12,"bold"))
        Right_frame.place(x=750,y=10,width=720,height=580)

        table_frame = Frame(Right_frame,bd=2,bg="white",relief=RIDGE)
        table_frame.place(x=0,y=10,width=700,height=350)

        #scrollbar
        scroll_x = ttk.Scrollbar(Right_frame,orient=HORIZONTAL)
        scroll_y = ttk.Scrollbar(Right_frame,orient=VERTICAL)

        self.AttendenceReport = ttk.Treeview(Right_frame,columns=("id","roll","name","department","time","date","attendance"),xscrollcommand=scroll_x.set,yscrollcommand=scroll_y.set)

        scroll_x.pack(side=BOTTOM,fill=X)
        scroll_y.pack(side=RIGHT,fill=Y)

        scroll_x.config(command=self.AttendenceReport.xview)
        scroll_y.config(command=self.AttendenceReport.yview)

        self.AttendenceReport.heading("id",text="ID")
        self.AttendenceReport.heading("roll",text="Roll")
        self.AttendenceReport.heading("name",text="Name")
        self.AttendenceReport.heading("department",text="Department")
        self.AttendenceReport.heading("time",text="Time")
        self.AttendenceReport.heading("date",text="Date")
        self.AttendenceReport.heading("attendance",text="Attendance")
        self.AttendenceReport["show"]="headings"

        self.AttendenceReport.column("id",width=50)
        self.AttendenceReport.column("roll",width=100)
        self.AttendenceReport.column("name",width=100)
        self.AttendenceReport.column("department",width=100)
        self.AttendenceReport.column("time",width=100)
        self.AttendenceReport.column("date",width=100)
        self.AttendenceReport.column("attendance",width=100)

        self.AttendenceReport.pack(fill=BOTH,expand=1)
        self.createAttendanceTable()
        self.fetchData()

    def connectDb(self):
        from face_utils import get_db_connection
        return get_db_connection()

    def createAttendanceTable(self):
        try:
            conn = self.connectDb()
            cursor = conn.cursor()
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS attendence (
                    id VARCHAR(50),
                    roll VARCHAR(50),
                    name VARCHAR(100),
                    department VARCHAR(100),
                    time VARCHAR(20),
                    date VARCHAR(20),
                    attendance VARCHAR(20)
                )
                """
            )
            conn.commit()
        except Exception as e:
            messagebox.showerror("Error", f"Unable to create attendance table: {e}", parent=self.root)
        finally:
            try:
                conn.close()
            except Exception:
                pass

    def fetchData(self, rows=None):
        self.AttendenceReport.delete(*self.AttendenceReport.get_children())
        if rows is None:
            try:
                conn = self.connectDb()
                cursor = conn.cursor()
                cursor.execute("SELECT id, roll, name, department, time, date, attendance FROM attendence")
                rows = cursor.fetchall()
            except Exception:
                rows = []
            finally:
                try:
                    conn.close()
                except Exception:
                    pass

            if not rows:
                csv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "attendance.csv")
                if os.path.exists(csv_path):
                    try:
                        with open(csv_path, newline='', encoding='utf-8') as f:
                            reader = csv.reader(f)
                            rows = [row for row in reader if row]
                            if rows and rows[0][0].strip().lower() == 'id':
                                rows = rows[1:]
                    except Exception as e:
                        messagebox.showerror("Error", f"Unable to read attendance.csv: {e}", parent=self.root)
                        rows = []

        for row in rows:
            if len(row) >= 7:
                self.AttendenceReport.insert("", END, values=row)
            else:
                self.AttendenceReport.insert("", END, values=list(row) + [""] * (7 - len(row)))

    def importCsv(self):
        global mydata
        mydata.clear()
        fln = filedialog.askopenfilename(initialdir=os.getcwd(), title="Open CSV", filetypes=(("CSV File","*.csv"),("All File","*.*")), parent=self.root)
        if not fln:
            return
        try:
            with open(fln, newline='', encoding='utf-8') as myfile:
                csvread = csv.reader(myfile, delimiter=',')
                for row in csvread:
                    mydata.append(row)
                self.fetchData(mydata)
        except Exception as e:
            messagebox.showerror("Error", f"Unable to import CSV: {e}", parent=self.root)

    def saveData(self):
        attendance_id = self.AttendenceId_entry.get().strip()
        roll = self.roll_entry.get().strip()
        name = self.name_entry.get().strip()
        department = self.dep_entry.get().strip()
        time_value = self.time_entry.get().strip()
        date_value = self.date_entry.get().strip()
        attendance_value = self.atten_status.get().strip()

        if not attendance_id or not roll or not name:
            messagebox.showwarning("Warning", "ID, Roll and Name are required", parent=self.root)
            return

        try:
            conn = self.connectDb()
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO attendence (id, roll, name, department, time, date, attendance) VALUES (%s, %s, %s, %s, %s, %s, %s)",
                (attendance_id, roll, name, department, time_value, date_value, attendance_value)
            )
            conn.commit()
            messagebox.showinfo("Saved", "Attendance saved to MySQL", parent=self.root)
            self.fetchData()
        except Exception as e:
            messagebox.showerror("Error", f"Unable to save to database: {e}", parent=self.root)
        finally:
            try:
                conn.close()
            except Exception:
                pass

    def exportCsv(self):
        if not self.AttendenceReport.get_children():
            messagebox.showwarning("Warning", "No data to export", parent=self.root)
            return
        fln = filedialog.asksaveasfilename(defaultextension='.csv', filetypes=[('CSV File', '*.csv')], parent=self.root)
        if not fln:
            return
        try:
            with open(fln, 'w', newline='', encoding='utf-8') as myfile:
                csvwriter = csv.writer(myfile)
                csvwriter.writerow(["ID", "Roll", "Name", "Department", "Time", "Date", "Attendance"])
                for row_id in self.AttendenceReport.get_children():
                    row = self.AttendenceReport.item(row_id)['values']
                    csvwriter.writerow(row)
            messagebox.showinfo("Export", "CSV exported successfully", parent=self.root)
        except Exception as e:
            messagebox.showerror("Error", f"Unable to export CSV: {e}", parent=self.root)

    def updateData(self):
        selected = self.AttendenceReport.focus()
        if not selected:
            messagebox.showwarning("Warning", "Please select a record to update", parent=self.root)
            return
        values = [
            self.AttendenceId_entry.get(),
            self.roll_entry.get(),
            self.name_entry.get(),
            self.dep_entry.get(),
            self.time_entry.get(),
            self.date_entry.get(),
            self.atten_status.get(),
        ]
        self.AttendenceReport.item(selected, values=values)
        messagebox.showinfo("Update", "Record updated", parent=self.root)

    def reset(self):
        for widget in ["AttendenceId_entry", "roll_entry", "name_entry", "dep_entry", "time_entry", "date_entry"]:
            try:
                getattr(self, widget).delete(0, END)
            except Exception:
                pass
        self.atten_status.current(0)


if __name__ == "__main__":
    root = Tk()
    obj = Attendence(root)
    root.mainloop()        
