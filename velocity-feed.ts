import { FeedGenerator } from '@atproto/app';

class VelocityFeed extends FeedGenerator {
  async getFeed(params: {cursor?: string}) {
    const skeleton = await this.ctx.services.appView.getTimeline(params);  // Base AT feed
    const filtered = skeleton.feed.filter(async (item) => {
      const vSignals = await this.computeVelocity(item.post.uri);
      const intent = { type: 'feed.include', signals: vSignals };
      return (await evaluateIntent(intent)).decision === 'ALLOW';
    });
    return { feed: filtered, cursor: params.cursor };
  }

  async computeVelocity(uri: string): Promise<{velocity: number}> {
    // Query repo for post metrics
    const metrics = await this.ctx.services.biggraph.getPostMetrics(uri);
    return { velocity: metrics.likes / (Date.now() - metrics.created) * 3600000 };  // Likes/hour
  }
}

// Register: new VelocityFeed({ name: 'velocity-safe', ... });
