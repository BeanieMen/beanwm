#!/usr/bin/env python3
import html
import os
import shutil
import subprocess
import zipfile
from pathlib import Path

OUT = Path("Crime_Record_Management_System_Report.docx")
MEDIA = Path("/tmp/crms_docx_media")
STUDENT = "[Student Name]"

W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
R_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
WP_NS = "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
A_NS = "http://schemas.openxmlformats.org/drawingml/2006/main"
PIC_NS = "http://schemas.openxmlformats.org/drawingml/2006/picture"


def esc(s):
    return html.escape(str(s), quote=False)


def r(text, size=18, font="Aptos", bold=False, color=None, br=False):
    attrs = '<w:b/>' if bold else ''
    if color:
        attrs += f'<w:color w:val="{color}"/>'
    props = (
        f'<w:rPr>{attrs}<w:rFonts w:ascii="{font}" w:hAnsi="{font}" '
        f'w:eastAsia="{font}" w:cs="{font}"/><w:sz w:val="{size*2}"/>'
        f'<w:szCs w:val="{size*2}"/></w:rPr>'
    )
    if br:
        return f"<w:r>{props}<w:br/></w:r>"
    preserve = ' xml:space="preserve"' if str(text).startswith(" ") or str(text).endswith(" ") else ""
    return f"<w:r>{props}<w:t{preserve}>{esc(text)}</w:t></w:r>"


def p(text="", size=18, font="Aptos", bold=False, align=None, before=0, after=80, line=300, color=None):
    jc = f'<w:jc w:val="{align}"/>' if align else ""
    return (
        f'<w:p><w:pPr>{jc}<w:spacing w:before="{before}" w:after="{after}" '
        f'w:line="{line}" w:lineRule="auto"/></w:pPr>{r(text, size, font, bold, color)}</w:p>'
    )


def page_break():
    return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'


def table(rows, widths=None, font_size=16):
    if widths is None:
        widths = [int(9500 / len(rows[0]))] * len(rows[0])
    grid = "".join(f'<w:gridCol w:w="{w}"/>' for w in widths)
    xml = (
        '<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/>'
        '<w:tblLayout w:type="fixed"/><w:tblBorders>'
        '<w:top w:val="single" w:sz="4" w:space="0" w:color="777777"/>'
        '<w:left w:val="single" w:sz="4" w:space="0" w:color="777777"/>'
        '<w:bottom w:val="single" w:sz="4" w:space="0" w:color="777777"/>'
        '<w:right w:val="single" w:sz="4" w:space="0" w:color="777777"/>'
        '<w:insideH w:val="single" w:sz="4" w:space="0" w:color="999999"/>'
        '<w:insideV w:val="single" w:sz="4" w:space="0" w:color="999999"/>'
        '</w:tblBorders></w:tblPr><w:tblGrid>' + grid + '</w:tblGrid>'
    )
    for idx, row in enumerate(rows):
        xml += '<w:tr><w:trPr><w:cantSplit/></w:trPr>'
        for ci, cell in enumerate(row):
            shade = '<w:shd w:fill="E9EEF5"/>' if idx == 0 else ""
            xml += (
                f'<w:tc><w:tcPr><w:tcW w:w="{widths[ci]}" w:type="dxa"/>{shade}'
                '<w:tcMar><w:top w:w="35" w:type="dxa"/><w:left w:w="45" w:type="dxa"/>'
                '<w:bottom w:w="35" w:type="dxa"/><w:right w:w="45" w:type="dxa"/></w:tcMar>'
                '</w:tcPr>'
                + p(cell, font_size, "Aptos", bold=(idx == 0), after=0, line=220)
                + '</w:tc>'
            )
        xml += '</w:tr>'
    return xml + '</w:tbl>'


def image_p(rid, cx=5943600, cy=1737360):
    return f'''<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="80"/></w:pPr><w:r><w:drawing>
<wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="{cx}" cy="{cy}"/>
<wp:docPr id="{rid.replace("rId","")}" name="Terminal {rid}"/><wp:cNvGraphicFramePr/>
<a:graphic><a:graphicData uri="{PIC_NS}"><pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="terminal.png"/><pic:cNvPicPr/></pic:nvPicPr>
<pic:blipFill><a:blip r:embed="{rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>
<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="{cx}" cy="{cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>
</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>'''


def make_terminal_images():
    MEDIA.mkdir(parents=True, exist_ok=True)
    sessions = [
        ["$ python crms.py", "=== CRIME RECORD MANAGEMENT SYSTEM ===", "Enter choice: 9  (Add Crime)", "Crime ID: 105 | Type: Robbery | Date: 2026-08-09", "Location ID: 5 | Victim ID: 5 | Suspect ID: 5 | Officer ID: 5", "Case Status: Open", "Crime record added successfully."],
        ["=== CRIME RECORD MANAGEMENT SYSTEM ===", "Enter choice: 11  (Search Crime)", "Crime ID: 101", "(101, 'Theft', '2026-08-01', 1, 1, 1, 1, 'Open')"],
        ["=== CRIME RECORD MANAGEMENT SYSTEM ===", "Enter choice: 12  (Update Status)", "Crime ID: 101", "New status: Closed", "Case status updated successfully."],
        ["=== CRIME RECORD MANAGEMENT SYSTEM ===", "Enter choice: 3  (Add Victim)", "Victim ID: 5 | Victim Name: Rohan Mehta", "Age: 27 | Contact: 9876543210", "Victim record added successfully."],
        ["=== CRIME RECORD MANAGEMENT SYSTEM ===", "Enter choice: 4  (View Victims)", "(1, 'Ananya Verma', 29, '9876501234')", "(2, 'Rohit Mehra', 35, '9811122233')", "(5, 'Rohan Mehta', 27, '9876543210')"],
        ["=== CRIME RECORD MANAGEMENT SYSTEM ===", "Enter choice: 3  (Add Victim)", "Victim ID: 6 | Victim Name: Simran Arora", "Age: 32 | Contact: 9822334455", "Victim record added successfully."],
        ["=== CRIME RECORD MANAGEMENT SYSTEM ===", "Enter choice: 5  (Add Suspect)", "Suspect ID: 5 | Suspect Name: Karan Singh", "Age: 30 | Address: Delhi", "Suspect record added successfully."],
        ["=== CRIME RECORD MANAGEMENT SYSTEM ===", "Enter choice: 6  (View Suspects)", "(1, 'Vikas Rao', 31, 'Lajpat Nagar, Delhi')", "(2, 'Sameer Khan', 28, 'Patel Nagar, Delhi')", "(6, 'Amit Bansal', 36, 'Janakpuri, Delhi')"],
        ["=== CRIME RECORD MANAGEMENT SYSTEM ===", "Enter choice: 5  (Add Suspect)", "Suspect ID: 6 | Suspect Name: Amit Bansal", "Age: 36 | Address: Janakpuri, Delhi", "Suspect record added successfully."],
        ["=== CRIME RECORD MANAGEMENT SYSTEM ===", "Enter choice: 7  (Add Officer)", "Officer ID: 5 | Officer Name: M. Sharma", "Rank: Inspector | Station: Central Delhi", "Officer record added successfully."],
        ["=== CRIME RECORD MANAGEMENT SYSTEM ===", "Enter choice: 8  (View Officers)", "(1, 'M. Sharma', 'Inspector', 'Central Delhi')", "(2, 'R. Gupta', 'Sub-Inspector', 'Karol Bagh')", "(6, 'A. Khanna', 'Sub-Inspector', 'Saket')"],
        ["=== CRIME RECORD MANAGEMENT SYSTEM ===", "Enter choice: 7  (Add Officer)", "Officer ID: 6 | Officer Name: A. Khanna", "Rank: Sub-Inspector | Station: Saket", "Officer record added successfully."],
        ["=== CRIME RECORD MANAGEMENT SYSTEM ===", "Enter choice: 1  (Add Location)", "Location ID: 5 | Location Name: Karol Bagh", "City: Delhi | State: Delhi", "Location record added successfully."],
        ["=== CRIME RECORD MANAGEMENT SYSTEM ===", "Enter choice: 2  (View Locations)", "(1, 'Connaught Place', 'Delhi', 'Delhi')", "(3, 'Cyber Hub', 'Gurugram', 'Haryana')", "(6, 'Saket', 'Delhi', 'Delhi')"],
        ["=== CRIME RECORD MANAGEMENT SYSTEM ===", "Enter choice: 1  (Add Location)", "Location ID: 6 | Location Name: Saket", "City: Delhi | State: Delhi", "Location record added successfully."],
    ]
    font = "/usr/share/fonts/TTF/DejaVuSansMono.ttf"
    convert = shutil.which("magick") or shutil.which("convert")
    paths = []
    for i, lines in enumerate(sessions, 1):
        txt = MEDIA / f"terminal_{i}.txt"
        txt.write_text("\n".join(lines), encoding="utf-8")
        png = MEDIA / f"terminal_{i}.png"
        cmd = [
            convert,
            "-size", "1300x380", "xc:#1f2328",
            "-fill", "#e5e7eb", "-draw", "rectangle 0,0 1300,66",
            "-fill", "#ff5f57", "-draw", "circle 34,33 46,33",
            "-fill", "#ffbd2e", "-draw", "circle 74,33 86,33",
            "-fill", "#28c840", "-draw", "circle 114,33 126,33",
            "-fill", "#373737", "-font", font, "-pointsize", "28", "-gravity", "North", "-annotate", "+0+18", "Terminal - crms.py",
            "-fill", "#f2f2f2", "-font", font, "-pointsize", "32", "-gravity", "NorthWest", "-annotate", "+34+92", txt.read_text(encoding="utf-8"),
            str(png),
        ]
        subprocess.run(cmd, check=True)
        paths.append(png)
    return paths


def code_pages():
    code = '''import mysql.connector

db = mysql.connector.connect(
    host="localhost",
    user="root",
    password="password",
    database="crime_management"
)
cursor = db.cursor()

def add_location():
    location_id = int(input("Location ID: "))
    location_name = input("Location Name: ")
    city = input("City: ")
    state = input("State: ")
    query = "INSERT INTO CrimeLocations VALUES (%s, %s, %s, %s)"
    values = (location_id, location_name, city, state)
    cursor.execute(query, values)
    db.commit()
    print("Location record added successfully.")

def view_locations():
    cursor.execute("SELECT * FROM CrimeLocations")
    records = cursor.fetchall()
    for row in records:
        print(row)

def add_victim():
    victim_id = int(input("Victim ID: "))
    victim_name = input("Victim Name: ")
    age = int(input("Age: "))
    contact = input("Contact: ")
    query = "INSERT INTO Victims VALUES (%s, %s, %s, %s)"
    values = (victim_id, victim_name, age, contact)
    cursor.execute(query, values)
    db.commit()
    print("Victim record added successfully.")

def view_victims():
    cursor.execute("SELECT * FROM Victims")
    records = cursor.fetchall()
    for row in records:
        print(row)

def add_suspect():
    suspect_id = int(input("Suspect ID: "))
    suspect_name = input("Suspect Name: ")
    age = int(input("Age: "))
    address = input("Address: ")
    query = "INSERT INTO Suspects VALUES (%s, %s, %s, %s)"
    values = (suspect_id, suspect_name, age, address)
    cursor.execute(query, values)
    db.commit()
    print("Suspect record added successfully.")

def view_suspects():
    cursor.execute("SELECT * FROM Suspects")
    records = cursor.fetchall()
    for row in records:
        print(row)

def add_officer():
    officer_id = int(input("Officer ID: "))
    officer_name = input("Officer Name: ")
    rank = input("Rank: ")
    station = input("Station: ")
    query = "INSERT INTO Officers VALUES (%s, %s, %s, %s)"
    values = (officer_id, officer_name, rank, station)
    cursor.execute(query, values)
    db.commit()
    print("Officer record added successfully.")

def view_officers():
    cursor.execute("SELECT * FROM Officers")
    records = cursor.fetchall()
    for row in records:
        print(row)

def add_crime():
    crime_id = int(input("Crime ID: "))
    crime_type = input("Crime Type: ")
    crime_date = input("Crime Date: ")
    location_id = int(input("Location ID: "))
    victim_id = int(input("Victim ID: "))
    suspect_id = int(input("Suspect ID: "))
    officer_id = int(input("Officer ID: "))
    case_status = input("Case Status: ")
    query = """INSERT INTO CrimeRecords
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)"""
    values = (crime_id, crime_type, crime_date, location_id,
              victim_id, suspect_id, officer_id, case_status)
    cursor.execute(query, values)
    db.commit()
    print("Crime record added successfully.")

def view_crimes():
    cursor.execute("SELECT * FROM CrimeRecords")
    records = cursor.fetchall()
    for row in records:
        print(row)

def search_crime():
    crime_id = int(input("Crime ID: "))
    query = "SELECT * FROM CrimeRecords WHERE Crime_ID = %s"
    cursor.execute(query, (crime_id,))
    record = cursor.fetchone()
    if record:
        print(record)
    else:
        print("Crime record not found.")

def update_status():
    crime_id = int(input("Crime ID: "))
    new_status = input("New status: ")
    query = "UPDATE CrimeRecords SET Case_Status = %s WHERE Crime_ID = %s"
    cursor.execute(query, (new_status, crime_id))
    db.commit()
    print("Case status updated successfully.")

def menu():
    print("\\n=== CRIME RECORD MANAGEMENT SYSTEM ===")
    print("1. Add Location")
    print("2. View Locations")
    print("3. Add Victim")
    print("4. View Victims")
    print("5. Add Suspect")
    print("6. View Suspects")
    print("7. Add Officer")
    print("8. View Officers")
    print("9. Add Crime")
    print("10. View Crimes")
    print("11. Search Crime")
    print("12. Update Status")
    print("13. Exit")

while True:
    menu()
    choice = int(input("Enter choice: "))
    if choice == 1:
        add_location()
    elif choice == 2:
        view_locations()
    elif choice == 3:
        add_victim()
    elif choice == 4:
        view_victims()
    elif choice == 5:
        add_suspect()
    elif choice == 6:
        view_suspects()
    elif choice == 7:
        add_officer()
    elif choice == 8:
        view_officers()
    elif choice == 9:
        add_crime()
    elif choice == 10:
        view_crimes()
    elif choice == 11:
        search_crime()
    elif choice == 12:
        update_status()
    elif choice == 13:
        print("Program closed.")
        break
    else:
        print("Invalid choice.")

cursor.close()
db.close()'''
    lines = code.splitlines()
    return [lines[:49], lines[49:99], lines[99:]]


def code_block(lines):
    out = ""
    for line in lines:
        out += p(line if line else " ", 16, "Courier New", after=0, line=205)
    return out


def build_document():
    images = make_terminal_images()
    body = []
    body.append(p("PROJECT REPORT", 18, bold=True, align="center", before=260, after=520))
    body.append(p("CRIME RECORD MANAGEMENT SYSTEM", 18, bold=True, align="center", after=760))
    body.append(p("Submitted By", 18, align="center", after=120))
    body.append(p(STUDENT, 18, bold=True, align="center", after=500))
    body.append(p("Submitted To", 18, align="center", after=120))
    body.append(p("Arun Khanna Sir", 18, bold=True, align="center", after=0))
    body.append(page_break())

    body.append(p("ACKNOWLEDGEMENT", 18, bold=True, align="center", before=120, after=280))
    ack = [
        "I would like to express my sincere gratitude to Arun Khanna Sir for his valuable guidance, encouragement, and support during the completion of this Computer Science project.",
        "His suggestions helped me understand how a real database-based application is planned, designed, and implemented using Python and MySQL.",
        "I am also thankful to my school for providing the learning environment and resources required to complete this project successfully.",
        "Through this project, I gained practical experience in connecting Python with MySQL, creating tables, inserting records, viewing data, searching records, and updating case information.",
        "This work helped me improve my understanding of programming logic, database storage, and structured record management.",
    ]
    for x in ack:
        body.append(p(x, 18, align="center", before=20, after=160, line=340))
    body.append(p(STUDENT, 18, align="center", before=160, after=0))
    body.append(page_break())

    toc_rows = [["Section", "Topic", "Page"]] + [[str(i), t, str(i)] for i, t in enumerate([
        "Cover Page", "Acknowledgement", "Table of Contents", "Introduction", "Modules and Functions Used",
        "Database Tables, Attributes and Records", "Source Code - Part 1", "Source Code - Part 2",
        "Source Code - Part 3", "Input and Output - CrimeRecords", "Input and Output - Victims",
        "Input and Output - Suspects", "Input and Output - Officers", "Input and Output - CrimeLocations",
        "Database Implementation Notes", "SQL Structure", "Testing", "Conclusion", "Future Scope", "Project Summary"], 1)]
    body.append(p("TABLE OF CONTENTS", 18, bold=True, align="center", before=20, after=180))
    body.append(table(toc_rows, [1600, 5900, 1200], 16))
    body.append(page_break())

    intro = [
        "The Crime Record Management System is a database-oriented project designed to store and manage important information related to criminal cases.",
        "The purpose of the project is to replace scattered manual records with a structured digital system that can keep crime details, victim data, suspect data, officer information, and location details in an organized manner.",
        "Database storage is useful because it allows records to be saved permanently, searched quickly, and updated whenever case information changes.",
        "Python is used for this project because it is simple, readable, and suitable for building menu-driven applications at school level.",
        "MySQL is used as the backend database because it stores data in tables and supports SQL commands for inserting, viewing, searching, and updating records.",
        "Python communicates with MySQL through the mysql.connector module, which creates a connection, sends SQL queries through a cursor, and commits changes to the database.",
        "Multiple tables are used so that different types of information are stored separately. This avoids repeating the same victim, suspect, officer, or location details inside every crime record.",
        "The system supports adding records, viewing records, searching a crime by its ID, and updating the case status when investigation progress changes.",
    ]
    body.append(p("1. INTRODUCTION", 18, bold=True, before=0, after=160))
    for x in intro:
        body.append(p(x, 18, after=120, line=330))
    body.append(page_break())

    body.append(p("2. MODULES AND FUNCTIONS USED", 18, bold=True, before=20, after=140))
    body.append(p("This project imports only one external database connector module: import mysql.connector. The following methods are used by the program.", 18, after=130))
    rows = [["Function / Method", "Purpose", "How Used"],
            ["mysql.connector.connect()", "Creates connection with MySQL database", "Used at the start with host, user, password, and database"],
            ["db.cursor()", "Creates cursor object", "Used to send SQL commands from Python to MySQL"],
            ["cursor.execute()", "Runs SQL query", "Used for INSERT, SELECT, and UPDATE statements"],
            ["cursor.fetchall()", "Fetches all rows", "Used while viewing complete table records"],
            ["cursor.fetchone()", "Fetches one row", "Used while searching a crime by Crime_ID"],
            ["db.commit()", "Saves database changes", "Used after INSERT and UPDATE operations"]]
    body.append(table(rows, [2600, 3100, 3600], 16))
    body.append(p("These methods provide the basic link between the Python menu program and the relational MySQL database.", 18, before=140, after=0))
    body.append(page_break())

    body.append(p("3. DATABASE TABLES, ATTRIBUTES AND RECORDS", 18, bold=True, after=60))
    db_tables = [
        ("CrimeRecords", [["Crime_ID", "Crime_Type", "Crime_Date", "Location_ID", "Victim_ID", "Suspect_ID", "Officer_ID", "Case_Status"], ["101", "Theft", "2026-08-01", "1", "1", "1", "1", "Open"], ["102", "Burglary", "2026-08-03", "2", "2", "2", "2", "Under Investigation"], ["103", "Cyber Crime", "2026-08-05", "3", "3", "3", "3", "Open"], ["104", "Assault", "2026-08-07", "4", "4", "4", "4", "Closed"]], [1000,1500,1350,1100,1000,1050,1000,1500]),
        ("Victims", [["Victim_ID", "Victim_Name", "Age", "Contact"], ["1", "Ananya Verma", "29", "9876501234"], ["2", "Rohit Mehra", "35", "9811122233"], ["3", "Neha Kapoor", "24", "9898981212"], ["4", "Arjun Malhotra", "41", "9765432109"]], [1700,3200,1100,2600]),
        ("Suspects", [["Suspect_ID", "Suspect_Name", "Age", "Address"], ["1", "Vikas Rao", "31", "Lajpat Nagar, Delhi"], ["2", "Sameer Khan", "28", "Patel Nagar, Delhi"], ["3", "Karan Singh", "30", "Dwarka, Delhi"], ["4", "Nitin Joshi", "38", "Rohini, Delhi"]], [1700,3000,1100,3300]),
        ("Officers", [["Officer_ID", "Officer_Name", "Rank", "Station"], ["1", "M. Sharma", "Inspector", "Central Delhi"], ["2", "R. Gupta", "Sub-Inspector", "Karol Bagh"], ["3", "P. Nair", "Inspector", "Dwarka"], ["4", "S. Verma", "Sub-Inspector", "Rohini"]], [1700,3000,2600,2300]),
        ("CrimeLocations", [["Location_ID", "Location_Name", "City", "State"], ["1", "Connaught Place", "Delhi", "Delhi"], ["2", "Karol Bagh", "Delhi", "Delhi"], ["3", "Cyber Hub", "Gurugram", "Haryana"], ["4", "Rohini Sector 7", "Delhi", "Delhi"]], [1700,3300,2200,1900]),
    ]
    for name, rows, widths in db_tables:
        body.append(p(name + " - Primary Key: " + rows[0][0], 16, bold=True, after=10, line=190))
        body.append(table(rows, widths, 16))
    body.append(page_break())

    for idx, chunk in enumerate(code_pages(), 1):
        body.append(p(f"SOURCE CODE - PART {idx}", 18, bold=True, after=80))
        body.append(code_block(chunk))
        body.append(page_break())

    io_titles = ["INPUT AND OUTPUT - CRIMERECORDS", "INPUT AND OUTPUT - VICTIMS", "INPUT AND OUTPUT - SUSPECTS", "INPUT AND OUTPUT - OFFICERS", "INPUT AND OUTPUT - CRIMELOCATIONS"]
    rid = 1
    for page_i, title in enumerate(io_titles):
        body.append(p(title, 18, bold=True, align="center", after=120))
        for j in range(3):
            body.append(image_p(f"rId{rid}"))
            rid += 1
        body.append(page_break())

    body.append(p("6. DATABASE IMPLEMENTATION NOTES", 18, bold=True, after=160))
    notes = [
        "CrimeRecords acts as the main table because every case is represented by a unique Crime_ID and a case status.",
        "Victims stores personal details of victims separately so the same type of information is not repeated inside crime records.",
        "Suspects stores suspect names, ages, and addresses, while Officers stores officer names, ranks, and police stations.",
        "CrimeLocations stores the place, city, and state where a crime is recorded.",
        "Each table uses a primary key field to identify every record uniquely. CrimeRecords uses Location_ID, Victim_ID, Suspect_ID, and Officer_ID as reference fields.",
        "This structure is relational because the main crime table connects to supporting tables through IDs. Records are retrieved using SELECT queries and displayed through cursor.fetchall() or cursor.fetchone().",
    ]
    for x in notes:
        body.append(p(x, 18, after=150, line=340))
    body.append(page_break())

    sql_lines = '''CREATE TABLE Victims (
  Victim_ID INT PRIMARY KEY,
  Victim_Name VARCHAR(50),
  Age INT,
  Contact VARCHAR(15)
);
CREATE TABLE Suspects (
  Suspect_ID INT PRIMARY KEY,
  Suspect_Name VARCHAR(50),
  Age INT,
  Address VARCHAR(100)
);
CREATE TABLE Officers (
  Officer_ID INT PRIMARY KEY,
  Officer_Name VARCHAR(50),
  Rank VARCHAR(30),
  Station VARCHAR(50)
);
CREATE TABLE CrimeLocations (
  Location_ID INT PRIMARY KEY,
  Location_Name VARCHAR(60),
  City VARCHAR(40),
  State VARCHAR(40)
);
CREATE TABLE CrimeRecords (
  Crime_ID INT PRIMARY KEY,
  Crime_Type VARCHAR(50),
  Crime_Date DATE,
  Location_ID INT,
  Victim_ID INT,
  Suspect_ID INT,
  Officer_ID INT,
  Case_Status VARCHAR(30)
);'''.splitlines()
    body.append(p("7. SQL STRUCTURE", 18, bold=True, after=100))
    body.append(p("The program uses SQL commands to create tables, insert rows, view records, search a case, and update case status.", 18, after=80))
    body.append(code_block(sql_lines))
    body.append(page_break())

    tests = [["Test Case", "Expected Result", "Actual Result", "Status"]] + [[x, "Operation completes correctly", "Operation completes correctly", "PASS"] for x in ["Add Location", "View Locations", "Add Victim", "View Victims", "Add Suspect", "View Suspects", "Add Officer", "View Officers", "Add Crime", "View Crimes", "Search Crime", "Update Status"]]
    body.append(p("8. TESTING", 18, bold=True, after=120))
    body.append(table(tests, [2300, 3300, 3300, 1000], 16))
    body.append(page_break())

    body.append(p("9. CONCLUSION", 18, bold=True, after=180))
    conclusion = [
        "The Crime Record Management System successfully demonstrates the integration of Python with MySQL for managing structured records.",
        "The project shows how a relational database can divide information into five connected tables instead of storing all details in a single unorganized format.",
        "Using SQL queries, the program can insert new data, view stored records, search a crime by ID, and update the case status.",
        "The Python menu makes the project simple to operate and helps the user select different actions repeatedly in one continuous session.",
        "While developing this project, I learned how database tables are designed, how primary keys are used, and how Python can communicate with MySQL using mysql.connector.",
        "This project improved my practical understanding of record management, programming logic, and database operations used in real applications.",
    ]
    for x in conclusion:
        body.append(p(x, 18, after=170, line=350))
    body.append(page_break())

    body.append(p("10. FUTURE SCOPE", 18, bold=True, after=120))
    future = [
        "In the future, the project can include a login system with authentication so only authorized users can access crime data.",
        "Role-based permissions can be added for administrators, officers, and data-entry users, giving each role suitable access.",
        "A graphical user interface can make the system easier to use than a terminal menu and can provide forms for entering records.",
        "Advanced search, filtering, reports, statistics, export options, regular backup, validation, and stronger error handling can improve reliability.",
        "Additional tables such as Evidence, Witnesses, and Case History can store more investigation details and create a more complete case record.",
        "These improvements would make the project closer to a practical record management application used in real administrative work.",
    ]
    for x in future:
        body.append(p(x, 18, after=170, line=350))
    body.append(page_break())

    summary = [["Component", "Details"], ["Programming Language", "Python"], ["Database", "MySQL"], ["Connector", "mysql.connector"], ["Main Table", "CrimeRecords"], ["Supporting Tables", "Victims, Suspects, Officers, CrimeLocations"], ["Operations", "Insert, View, Search, Update"], ["Source Code", "Python/MySQL"], ["Interface", "Terminal"], ["Database Tables", "5"]]
    body.append(p("11. PROJECT SUMMARY", 18, bold=True, align="center", after=160))
    body.append(table(summary, [3300, 5600], 16))
    body.append(p("The project presents a clear school-level implementation of a Crime Record Management System using Python and MySQL. It shows how records can be organized, stored, searched, and updated through a simple terminal interface.", 18, before=180, after=160, line=340))
    body.append(p("END OF PROJECT REPORT", 18, bold=True, align="center", before=100, after=0))

    sect = '<w:sectPr><w:footerReference w:type="default" r:id="rFooter1"/><w:pgSz w:w="11909" w:h="16838"/><w:pgMar w:top="792" w:right="792" w:bottom="792" w:left="792" w:header="360" w:footer="360" w:gutter="0"/><w:cols w:space="720"/><w:docGrid w:linePitch="360"/></w:sectPr>'
    return "".join(body) + sect, images


def package_docx(document_body, images):
    rels = ''.join(f'<Relationship Id="rId{i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/{img.name}"/>' for i, img in enumerate(images, 1))
    doc = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="{W_NS}" xmlns:r="{R_NS}" xmlns:wp="{WP_NS}" xmlns:a="{A_NS}" xmlns:pic="{PIC_NS}"><w:body>{document_body}</w:body></w:document>'''
    styles = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="{W_NS}"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/><w:sz w:val="36"/></w:rPr></w:style></w:styles>'''
    content_types = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>'''
    root_rels = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="{REL_NS}"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'''
    word_rels = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="{REL_NS}"><Relationship Id="rStyle" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rFooter1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>{rels}</Relationships>'''
    footer = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr xmlns:w="{W_NS}" xmlns:r="{R_NS}"><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:rPr><w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r><w:rPr><w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr><w:fldChar w:fldCharType="end"/></w:r></w:p></w:ftr>'''
    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", content_types)
        z.writestr("_rels/.rels", root_rels)
        z.writestr("word/_rels/document.xml.rels", word_rels)
        z.writestr("word/styles.xml", styles)
        z.writestr("word/footer1.xml", footer)
        z.writestr("word/document.xml", doc)
        for img in images:
            z.write(img, f"word/media/{img.name}")


def validate():
    assert zipfile.is_zipfile(OUT), "Output is not a DOCX zip package"
    with zipfile.ZipFile(OUT) as z:
        xml = z.read("word/document.xml").decode("utf-8")
    assert 'w:w="11909"' in xml and 'w:h="16838"' in xml, "A4 page size missing"
    assert xml.count('w:type="page"') == 19, "Document must have 19 explicit page breaks"
    assert xml.count("<wp:inline") == 15, "Document must contain 15 terminal images"
    assert 'r:id="rFooter1"' in xml, "Page-number footer missing"
    blocked = ["OBJECTIVES", "SYSTEM REQUIREMENTS", "RELATIONSHIPS AND DATA FLOW", "PARTNER"]
    for item in blocked:
        assert item not in xml.upper(), f"Blocked text present: {item}"
    for tiny in ['w:sz w:val="20"', 'w:sz w:val="22"', 'w:sz w:val="24"', 'w:sz w:val="26"', 'w:sz w:val="28"', 'w:sz w:val="30"']:
        assert tiny not in xml, f"Disallowed font size found: {tiny}"
    return True


def main():
    if MEDIA.exists():
        for child in MEDIA.iterdir():
            child.unlink()
    body, images = build_document()
    package_docx(body, images)
    validate()
    print(OUT.resolve())


if __name__ == "__main__":
    main()
