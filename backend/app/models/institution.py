"""models/institution.py — Institution domain models"""
from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    Text,
    Boolean,
    Float,
    ForeignKey,
    UniqueConstraint,
    Index,
)
from sqlalchemy.sql import func
from app.models.base import Base

class Institution(Base):
    __tablename__ = "institutions"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), unique=True, nullable=False)
    slug = Column(String(100), unique=True, index=True, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Branding settings
    logo_url = Column(String(255), nullable=True)
    primary_color = Column(String(50), nullable=True)
    secondary_color = Column(String(50), nullable=True)
    app_name = Column(String(100), nullable=True)
    custom_domain = Column(String(200), nullable=True)
    faq_json = Column(Text, nullable=True)
    
    # Subscription / billing
    subscription_plan = Column(String(50), default="free")
    subscription_status = Column(String(50), default="active")
    razorpay_key_id = Column(String(100), nullable=True)
    student_limit = Column(Integer, default=500)
    
    # Institution specific master key
    master_key = Column(String(100), nullable=True)

    # Multi-campus support
    parent_institution_id = Column(Integer, nullable=True)
    campus_name = Column(String(100), nullable=True)
    campus_address = Column(String(255), nullable=True)


class Department(Base):
    __tablename__ = "departments"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(50), nullable=True)

    __table_args__ = (
        UniqueConstraint('institution_id', 'name', name='_institution_dept_name_uc'),
    )


class ApiKey(Base):
    __tablename__ = "api_keys"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    key_hash = Column(String(200), nullable=False)
    key_prefix = Column(String(12), nullable=False)
    scopes = Column(String(255), default="attendance:read")
    is_active = Column(Boolean, default=True)
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by = Column(String(100), nullable=True)


class SubscriptionPayment(Base):
    __tablename__ = "subscription_payments"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    plan = Column(String(50), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="INR")
    status = Column(String(50), default="pending")
    razorpay_order_id = Column(String(100), nullable=True)
    razorpay_payment_id = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class MarketplacePlugin(Base):
    __tablename__ = "marketplace_plugins"
    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String(80), unique=True, nullable=False)
    name = Column(String(120), nullable=False)
    price_inr = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


__all__ = ['Institution', 'Department', 'ApiKey', 'SubscriptionPayment', 'MarketplacePlugin']
