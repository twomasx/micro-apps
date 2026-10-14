import { describe, expect, it } from 'vitest';
import { buildToneGraph } from './audio';

/** Just enough of the Web Audio API to record how the nodes are wired. */
interface FakeNode {
  kind: string;
  outputs: { to: FakeNode; input: number }[];
  connect(to: FakeNode, ...rest: number[]): void;
  frequency: { value: number };
  gain: { value: number };
  type: string;
}

function fakeContext() {
  const node = (kind: string): FakeNode => ({
    kind,
    outputs: [],
    connect(to, ...rest) {
      this.outputs.push({ to, input: rest[1] ?? 0 });
    },
    frequency: { value: 440 },
    gain: { value: 1 },
    type: '',
  });
  return {
    createOscillator: () => node('oscillator'),
    createGain: () => node('gain'),
    createChannelMerger: () => node('merger'),
  } as unknown as BaseAudioContext;
}

describe('buildToneGraph', () => {
  const graph = buildToneGraph(fakeContext(), { carrier: 350, beat: 18 });
  const outputs = (node: unknown) => (node as FakeNode).outputs;

  it('tunes the left ear to the carrier and the right ear to carrier plus beat, as sine waves', () => {
    expect(graph.left.frequency.value).toBe(350);
    expect(graph.right.frequency.value).toBe(368);
    expect(graph.left.type).toBe('sine');
    expect(graph.right.type).toBe('sine');
  });

  it('sends the left tone only to channel 0 and the right tone only to channel 1', () => {
    expect(outputs(graph.left)).toEqual([{ to: graph.leftGain, input: 0 }]);
    expect(outputs(graph.right)).toEqual([{ to: graph.rightGain, input: 0 }]);
    expect(outputs(graph.leftGain)).toEqual([{ to: graph.merger, input: 0 }]);
    expect(outputs(graph.rightGain)).toEqual([{ to: graph.merger, input: 1 }]);
  });

  it('runs both ears through the volume and then the fade', () => {
    expect(outputs(graph.merger)).toEqual([{ to: graph.volume, input: 0 }]);
    expect(outputs(graph.volume)).toEqual([{ to: graph.fade, input: 0 }]);
  });

  it('starts silent', () => {
    expect(graph.fade.gain.value).toBe(0);
  });
});
