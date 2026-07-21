"""
scheduler.py — APScheduler job to refresh live data every hour.

Simple setup: one BackgroundScheduler, one interval job.
Called from main.py lifespan events.
"""

import logging
from typing import Optional
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

logger = logging.getLogger(__name__)

_scheduler: Optional[BackgroundScheduler] = None


def _refresh_job():
    """The actual job that runs each hour."""
    from backend.ingest import run_refresh
    try:
        result = run_refresh()
        logger.info("Scheduled refresh complete: %s", result)
    except Exception as e:
        logger.error("Scheduled refresh failed: %s", e)


def start_scheduler():
    """Start the background scheduler with an hourly refresh job."""
    global _scheduler
    if _scheduler is not None:
        logger.warning("Scheduler already running")
        return

    _scheduler = BackgroundScheduler()
    _scheduler.add_job(
        _refresh_job,
        trigger=IntervalTrigger(hours=1),
        id="live_data_refresh",
        name="Hourly CPCB + OWM data refresh",
        replace_existing=True,
    )
    _scheduler.start()
    logger.info("Scheduler started — refreshing every 1 hour")


def stop_scheduler():
    """Shut down the scheduler gracefully."""
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
        logger.info("Scheduler stopped")
