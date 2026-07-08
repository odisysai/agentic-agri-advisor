"""Firestore-only database manager for Krishi Sampark.

Local development uses the Firestore Emulator. Production uses Firestore Native
mode through the same function surface.
"""

from data.firestore_manager import (
    confirm_outbreak,
    delete_farm_data,
    export_farm_data,
    get_activities_log,
    get_admin_stats,
    get_admin_users,
    get_content_items,
    get_daily_plans,
    get_escalations,
    get_expert_queue,
    get_governance_metadata,
    get_latest_soil_report,
    get_observability_logs,
    get_outbreaks,
    get_profile_data,
    get_reminders,
    get_soil_reports,
    init_soil_tables,
    log_activity_record,
    log_observability_event,
    rollback_governance_version,
    save_content_item,
    save_escalation_request,
    save_farmer_field,
    save_privacy_preferences,
    save_soil_report,
    seed_default_data,
    update_expert_case_state,
    update_plan_state,
    update_planting_telemetry,
    update_reminder_state,
)
