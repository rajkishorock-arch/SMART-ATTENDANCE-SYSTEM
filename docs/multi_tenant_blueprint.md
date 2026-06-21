# Architectural Blueprint: Secure Multi-Tenant Expansion

This document presents a comprehensive, production-ready blueprint to scale our current **Smart Attendance System** into a **SaaS Multi-Tenant Platform**. This allows multiple schools, universities, and corporate offices to use the system independently, keeping their data completely isolated, secure, and hidden from one another.

---

## 1. Multi-Tenancy Strategy: Shared Database, Shared Schema with Logical Isolation

To balance cost-efficiency, speed of updates, and secure scaling, we select the **Logical Isolation (Row-Level Multi-Tenancy)** model using a unique **`institution_id`** (or `tenant_id`) scope across all database models.

```mermaid
graph TD
    subgraph Client Layer
        ReactApp["React Frontend App"]
        Sub1["du.attendance.io"] --> ReactApp
        Sub2["iitd.attendance.io"] --> ReactApp
    end

    subgraph API Layer (FastAPI)
        AuthMiddleware["JWT Auth Middleware (Extracts institution_id)"]
        ReactApp --> AuthMiddleware
    end

    subgraph Database Layer (PostgreSQL)
        Table1["Institutions Table"]
        Table2["Users Table (WHERE institution_id)"]
        Table3["Students Table (WHERE institution_id)"]
        Table4["Attendance Table (WHERE institution_id)"]
        
        AuthMiddleware --> Table1
        AuthMiddleware --> Table2
        AuthMiddleware --> Table3
        AuthMiddleware --> Table4
    end
```

---

## 2. Database Schema Redesign (SQLAlchemy Models)

We introduce a new `Institution` model and establish foreign keys on all existing tables to guarantee data scoping.

```python
from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, Float, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class Institution(Base):
    """
    Represents each individual tenant (College, School, Office).
    """
    __tablename__ = "institutions"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    slug = Column(String(100), unique=True, index=True, nullable=False)  # Used for subdomain routing (e.g., 'iitd')
    domain = Column(String(200), unique=True, nullable=True)             # Optional custom domain mapping
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    users = relationship("User", back_populates="institution")
    students = relationship("StudentModel", back_populates="institution")
    subjects = relationship("Subject", back_populates="institution")
    settings = relationship("SystemSettings", back_populates="institution", uselist=False)

# --- Modified Core Tables with Tenant Scope ---

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), index=True, nullable=False)
    password_hash = Column(String(200), nullable=False)
    role = Column(String(50), default="admin") # 'admin', 'teacher'
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    institution = relationship("Institution", back_populates="users")

class StudentModel(Base):
    __tablename__ = "student"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100))
    email = Column(String(100))
    roll = Column(String(45))
    dep = Column(String(100))
    face_embedding = Column(Text, nullable=True) # Mapped facial signature
    
    institution = relationship("Institution", back_populates="students")

class AttendanceModel(Base):
    __tablename__ = "attendence"
    id = Column(String(50), primary_key=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    roll = Column(String(50))
    name = Column(String(100))
    time = Column(String(20), primary_key=True)
    date = Column(String(20), primary_key=True)
    attendance = Column(String(20))
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True)
```

---

## 3. Backend (FastAPI) Tenant Scoping Dependency

To enforce security automatically on every query, we extract the tenant scope from the JWT token during requests.

### A. JWT Token Payload Expansion
When a user logs in, the payload will include the user's authorized `institution_id`:
```python
# auth.py
def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    # to_encode should contain: "sub": user.email, "role": user.role, "institution_id": user.institution_id
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
```

### B. FastAPI Tenant Injections Dependency
We write a FastAPI dependency that verifies the token, extracts the `institution_id`, and exposes it to routers:
```python
# dependencies.py
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from .database import get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")

def get_current_tenant_id(token: str = Depends(oauth2_scheme)) -> int:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        institution_id: int = payload.get("institution_id")
        if institution_id is None:
            raise credentials_exception
        return institution_id
    except JWTError:
        raise credentials_exception

# Example Router Query Enforcement
@router.get("/students/")
def list_students(
    db: Session = Depends(get_db), 
    institution_id: int = Depends(get_current_tenant_id)
):
    # This automatically guarantees that no user can see students belonging to other institutions.
    students = db.query(StudentModel).filter(StudentModel.institution_id == institution_id).all()
    return students
```

---

## 4. Frontend Subdomain & Dynamic Layout Routing (React)

The React application dynamically figures out which institution's portal is active by parsing the browser URL.

```javascript
// tenantConfig.js
export const getActiveTenantSlug = () => {
  const hostname = window.location.hostname; // e.g. "iitd.attendance.io" or "localhost"
  const parts = hostname.split('.');
  
  if (parts.length > 2) {
    // If it's a subdomain (e.g. iitd.attendance.io), extract "iitd"
    return parts[0]; 
  }
  
  // Default fallback or development override (can load institution selector)
  return localStorage.getItem('override_tenant') || 'default';
};Block

// App.jsx integration
useEffect(() => {
  const tenantSlug = getActiveTenantSlug();
  
  // Fetch custom branding config for this tenant (Logo, Custom Name, Theme Options)
  fetch(`${API_BASE_URL}/institutions/branding/${tenantSlug}`)
    .then(res => res.json())
    .then(branding => {
      document.title = `${branding.name} - Smart Attendance System`;
      setTenantBranding(branding); // Store in React state to display logo & layout colors
      
    });
}, []);
```

---

## 5. Security & Isolation Guard Rails

To guarantee maximum protection and compliance, three security features must be enabled:

1. **Row-Level Security (RLS) on PostgreSQL**:
   By executing RLS configurations, the database itself blocks queries that lack appropriate scope:
   ```sql
   ALTER TABLE student ENABLE ROW LEVEL SECURITY;
   
   CREATE POLICY student_tenant_isolation ON student
   USING (institution_id = current_setting('app.current_institution_id')::integer);
   ```
2. **Facial Template Storage Isolation**:
   When training or saving student facial profiles, directories in Cloud Storage/AWS S3 will be named with the tenant ID:
   `s3://face-attendance-templates/tenant_{institution_id}/student_{student_id}.bin`
   Access keys given to face-verification services are restricted to these specific paths.
3. **Preventing User Discovery**:
   The registration router must never reveal if an email exists under another tenant. Teneant lookup will be isolated globally, allowing `student@college.edu` to exist independently under two different institutions without conflicting.
