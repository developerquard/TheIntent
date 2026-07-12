# In Mastodon::ActivityPub::Tag (extend)
require 'json'

def process_incoming_activity(activity)
  velocity_tag = activity.object.tag.find { |t| t.type == 'velocity' }
  if velocity_tag
    signals = { velocity: velocity_tag.name.to_f, decay: velocity_tag.href.to_f }
    # Call your engine (e.g., via HTTP)
    response = HTTP.post('http://your-socialdiscovery/eval', json: { type: 'ap_note', signals: signals })
    decision = JSON.parse(response.body)
    return if decision['decision'] == 'ALLOW'
    # Block: Add label
    Labeler.label(activity.actor, 'high-velocity-spam')
  end
  super  # Proceed to normal processing
end

# Usage: Patch in app/models/activitypub/tag.rb
