import os
from  tkinter import *
from tkinter import ttk
from tkinter import messagebox, filedialog
from PIL import Image, ImageTk
import mysql.connector
import cv2
import csv
from face_utils import (
    setup_standard_window,
    make_card,
    make_button,
    make_section_label,
    style_button,
    UI_BG, UI_SURFACE, UI_SURFACE_ALT, UI_PRIMARY, UI_ACCENT,
    UI_TEXT, UI_TEXT_MUTED, UI_SUCCESS, UI_DANGER, UI_INFO,
    UI_PAD, UI_PAD_LG, UI_PAD_SM,
    UI_FONT_HEADING, UI_FONT_SUBTITLE, UI_FONT_BODY, UI_FONT_LABEL,
)

mydata = []
class Attendence:
    def __init__(self, root):
        self.root = root

        # ── Theme bootstrap ─────────────────────────────────────────────
        content = setup_standard_window(
            root,
            "Attendance Management",
            subtitle_text="Records  •  CSV Import / Export  •  MySQL Sync"
        )

        # ── Main split: Left (Form + Actions) | Right (Table) ──────────
        split = Frame(content, bg=UI_BG)
        split.pack(fill="both", expand=True)

        # ─────────── LEFT COLUMN: Entry form ───────────────────────────
        left_wrap = Frame(split, bg=UI_BG)
        left_wrap.pack(side="left", fill="both", expand=True, padx=(0, UI_PAD_LG))

        form_card = make_card(left_wrap, padx=UI_PAD_LG, pady=UI_PAD_LG)
        form_card.pack(fill="both", expand=True)
        lc = form_card._inner

        form_hdr = make_section_label(lc, "Record Entry", color=UI_PRIMARY)
        form_hdr.pack(anchor="w", pady=(0, UI_PAD))

        form_sub = Label(
            lc,
            text="Edit fields to create or modify an attendance row. Click a record in the right-hand table to auto-fill this form.",
            font=UI_FONT_BODY, bg=UI_SURFACE, fg=UI_TEXT_MUTED, wraplength=500, justify="left"
        )
        form_sub.pack(anchor="w", pady=(0, UI_PAD_LG))

        form_grid = Frame(lc, bg=UI_SURFACE)
        form_grid.pack(fill="x")

        # Helper: create a labeled field
        def field(row, col, label_text, widget):
            lbl = Label(form_grid, text=label_text,
                        font=UI_FONT_LABEL, bg=UI_SURFACE, fg=UI_TEXT_MUTED)
            lbl.grid(row=row, column=col * 2, padx=(0, UI_PAD_SM), pady=(UI_PAD_SM, 0), sticky="w")
            widget.grid(row=row, column=col * 2 + 1, pady=(UI_PAD_SM, 0), sticky="we")
            form_grid.grid_columnconfigure(col * 2 + 1, weight=1)

        self.AttendenceId_entry = ttk.Entry(form_grid, font=UI_FONT_BODY)
        field(0, 0, "Attendance ID", self.AttendenceId_entry)

        self.roll_entry = ttk.Entry(form_grid, font=UI_FONT_BODY)
        field(0, 1, "Roll Number", self.roll_entry)

        self.name_entry = ttk.Entry(form_grid, font=UI_FONT_BODY)
        field(1, 0, "Student Name", self.name_entry)

        self.dep_entry = ttk.Entry(form_grid, font=UI_FONT_BODY)
        field(1, 1, "Department", self.dep_entry)

        self.time_entry = ttk.Entry(form_grid, font=UI_FONT_BODY)
        field(2, 0, "Time (HH:MM:SS)", self.time_entry)

        self.date_entry = ttk.Entry(form_grid, font=UI_FONT_BODY)
        field(2, 1, "Date (DD/MM/YYYY)", self.date_entry)

        self.atten_status = ttk.Combobox(form_grid, font=UI_FONT_BODY, state="readonly",
                                         values=("Present", "Absent"))
        self.atten_status.current(0)
        field(3, 0, "Attendance Status", self.atten_status)

        # Empty spacer col 1 (row 3 col 1 empty)
        spacer = Frame(form_grid, bg=UI_SURFACE)
        spacer.grid(row=3, column=3, pady=(UI_PAD_SM, 0), sticky="we")

        # ── Action Buttons ─────────────────────────────────────────────
        btns_sep = Frame(lc, bg=UI_SURFACE)
        btns_sep.pack(fill="x", pady=(UI_PAD_LG, UI_PAD))
        sep = Frame(btns_sep, bg=UI_BORDER, height=1)
        sep.pack(fill="x")

        btns_hdr = make_section_label(lc, "Actions", color=UI_TEXT)
        btns_hdr.pack(anchor="w", pady=(0, UI_PAD_SM))

        # Top action row (Import/Export CSV)
        btns_row1 = Frame(lc, bg=UI_SURFACE)
        btns_row1.pack(fill="x", pady=(0, UI_PAD_SM))

        import_btn = make_button(btns_row1, "📥  Import CSV", command=self.importCsv, variant="secondary")
        import_btn.pack(side="left", padx=(0, UI_PAD_SM))

        export_btn = make_button(btns_row1, "📤  Export CSV", command=self.exportCsv, variant="secondary")
        export_btn.pack(side="left")

        # Bottom action row (Save/Update/Reset)
        btns_row2 = Frame(lc, bg=UI_SURFACE)
        btns_row2.pack(fill="x")

        save_btn = make_button(btns_row2, "💾  Save Record", command=self.saveData, variant="primary")
        save_btn.pack(side="left", padx=(0, UI_PAD_SM))

        update_btn = make_button(btns_row2, "✏️  Update", command=self.updateData, variant="success")
        update_btn.pack(side="left", padx=(0, UI_PAD_SM))

        reset_btn = make_button(btns_row2, "↺  Reset Fields", command=self.reset, variant="ghost")
        reset_btn.pack(side="left")

        # ─────────── RIGHT COLUMN: Attendance table ─────────────────────
        right_wrap = Frame(split, bg=UI_BG)
        right_wrap.pack(side="left", fill="both", expand=True, padx=(UI_PAD_LG, 0))

        table_card = make_card(right_wrap, padx=UI_PAD_LG, pady=UI_PAD_LG)
        table_card.pack(fill="both", expand=True)
        rc = table_card._inner

        table_hdr_row = Frame(rc, bg=UI_SURFACE)
        table_hdr_row.pack(fill="x", pady=(0, UI_PAD))

        table_hdr = make_section_label(table_hdr_row, "Attendance Records", color=UI_PRIMARY)
        table_hdr.pack(side="left", anchor="w")

        # Hint
        hint = Label(
            table_hdr_row,
            text="Data auto-loaded from MySQL → attendance.csv fallback",
            font=("Segoe UI", 9, "normal"), bg=UI_SURFACE, fg=UI_TEXT_MUTED
        )
        hint.pack(side="right", anchor="e")

        # Treeview container (to attach scrollbars)
        tv_container = Frame(rc, bg=UI_SURFACE,
                             highlightbackground=UI_BORDER, highlightthickness=1)
        tv_container.pack(fill="both", expand=True)

        scroll_x = ttk.Scrollbar(tv_container, orient=HORIZONTAL)
        scroll_y = ttk.Scrollbar(tv_container, orient=VERTICAL)

        self.AttendenceReport = ttk.Treeview(
            tv_container,
            columns=("id", "roll", "name", "department", "time", "date", "attendance"),
            xscrollcommand=scroll_x.set, yscrollcommand=scroll_y.set
        )

        scroll_x.pack(side=BOTTOM, fill=X)
        scroll_y.pack(side=RIGHT, fill=Y)
        scroll_x.config(command=self.AttendenceReport.xview)
        scroll_y.config(command=self.AttendenceReport.yview)

        col_defs = [
            ("id", "ID", 60),
            ("roll", "Roll", 100),
            ("name", "Name", 160),
            ("department", "Department", 160),
            ("time", "Time", 110),
            ("date", "Date", 110),
            ("attendance", "Status", 100),
        ]
        for key, label, width in col_defs:
            self.AttendenceReport.heading(key, text=label)
            self.AttendenceReport.column(key, width=width, anchor="w")

        self.AttendenceReport["show"] = "headings"
        self.AttendenceReport.pack(fill=BOTH, expand=True)

        # Row selection populates the form
        def on_row_select(_event=""):
            focus = self.AttendenceReport.focus()
            if not focus:
                return
            vals = self.AttendenceReport.item(focus, "values")
            fields = [
                self.AttendenceId_entry,
                self.roll_entry,
                self.name_entry,
                self.dep_entry,
                self.time_entry,
                self.date_entry,
            ]
            for entry, val in zip(fields, list(vals) + [""] * (len(fields) - len(vals))):
                entry.delete(0, END)
                entry.insert(0, str(val))
            # attendance status (last col)
            if len(vals) >= 7:
                try:
                    idx = ["Present", "Absent"].index(str(vals[6]))
                    self.atten_status.current(idx)
                except ValueError:
                    self.atten_status.current(0)

        self.AttendenceReport.bind("<<TreeviewSelect>>", on_row_select)

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
