from core.monitoring import summarize
import json

summary = summarize()
print("\nUAAL — MONITORING SUMMARY\n")
print(json.dumps(summary, indent=2))
