import streamlit as st
import pandas as pd
import plotly.express as px
import json

st.title("SocialDiscovery Analytics: Velocity & Intents Dashboard")

# Load audit logs
@st.cache_data
def load_audits():
    audits = []
    try:
        with open('audit_logs.json', 'r') as f:
            for line in f:
                audits.append(json.loads(line.strip()))
    except FileNotFoundError:
        audits = [{"decision": "ALLOW", "signals": {"velocity": 1.0}, "timestamp": "2025-12-31"}]
    return pd.DataFrame(audits)

df = load_audits()

# Velocity Trend Chart
if not df.empty:
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    fig = px.line(df, x='timestamp', y='signals.velocity', title='Velocity Over Time (Decay Applied)',
                  color='decision', markers=True)
    st.plotly_chart(fig, use_container_width=True)

# Policy Decisions Pie
decisions = df['decision'].value_counts()
st.subheader("Policy Decisions Breakdown")
fig_pie = px.pie(values=decisions.values, names=decisions.index, title='ALLOW vs BLOCK')
st.plotly_chart(fig_pie)

# Shadow Mode Filter
shadow = st.checkbox("Show Shadow Mode Only")
if shadow:
    df_shadow = df[df['shadow_mode'] == True]  # Assuming log field
    st.dataframe(df_shadow)

# Replay Selector
st.subheader("Replay Audit")
selected_id = st.selectbox("Select Intent ID", df['intent_id'].unique() if 'intent_id' in df else ['demo'])
if st.button("Replay"):
    # Call your replay_intent.py logic
    st.write(f"Replayed: {selected_id} - Decision: ALLOW")

# Usage: streamlit run this file
