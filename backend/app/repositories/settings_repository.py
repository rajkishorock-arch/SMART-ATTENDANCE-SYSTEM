"""
Settings Repository: encapsulates database access for SystemSettings with multi-tenant isolation.
"""
from sqlalchemy.orm import Session
from typing import Optional

from app import models, schemas


class SettingsRepository:
    """Encapsulates database access for tenant system settings."""

    @staticmethod
    def get_system_settings(
        db: Session,
        institution_id: Optional[int] = None
    ) -> Optional[models.SystemSettings]:
        """Retrieves system settings for an institution (or default)."""
        query = db.query(models.SystemSettings)
        if institution_id is not None:
            query = query.filter(models.SystemSettings.institution_id == institution_id)
        settings = query.first()

        if not settings:
            settings = models.SystemSettings(
                geofencing_enabled=False,
                center_latitude=28.6139,
                center_longitude=77.2090,
                allowed_radius_meters=100.0,
                ip_restriction_enabled=False,
                allowed_ip_ranges="127.0.0.1,192.168.1.0/24",
                institution_id=institution_id
            )
            db.add(settings)
            db.commit()
            db.refresh(settings)


        return settings

    @staticmethod
    def update_system_settings(
        db: Session,
        settings_in: schemas.SystemSettingsUpdate,
        institution_id: Optional[int] = None
    ) -> models.SystemSettings:
        """Updates system settings for an institution."""
        settings = SettingsRepository.get_system_settings(db, institution_id=institution_id)
        update_data = settings_in.model_dump(exclude_unset=True) if hasattr(settings_in, "model_dump") else settings_in.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(settings, field, value)
        db.add(settings)
        db.commit()
        db.refresh(settings)
        return settings
