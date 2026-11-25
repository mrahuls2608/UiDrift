import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ballPose, sceneProgress } from '@/lib/motion';
import { Reveal } from '@/components/motion/Reveal';
import { RollingSteps } from '@/features/landing/RollingSteps';

describe('sceneProgress', () => {
  it('maps a tall section scrolling through the viewport to 0…1', () => {
    expect(sceneProgress({ top: 100, height: 2600 }, 1000)).toBe(0);
    expect(sceneProgress({ top: -800, height: 2600 }, 1000)).toBe(0.5);
    expect(sceneProgress({ top: -5000, height: 2600 }, 1000)).toBe(1);
  });
});

describe('ballPose (rolling ball physics)', () => {
  const W = 900;
  const R = 32;

  it('rolls: rotation equals distance / radius', () => {
    const half = ballPose(0.5, W, R, 4);
    expect(half.x).toBe(450);
    expect(half.rotate).toBeCloseTo((450 / R) * (180 / Math.PI));
  });

  it('sits on the track at each stop and hops in an arc between stops', () => {
    expect(ballPose(0, W, R, 4).y).toBeCloseTo(0);
    expect(ballPose(1 / 3, W, R, 4).y).toBeCloseTo(0);
    expect(ballPose(1 / 6, W, R, 4).y).toBeCloseTo(-28); // top of the first hop
  });

  it('squashes when landing, never at rest at the ends', () => {
    const landing = ballPose(1 / 3 - 0.01, W, R, 4);
    expect(landing.scaleY).toBeLessThan(1);
    expect(landing.scaleX).toBeGreaterThan(1);
    expect(ballPose(0, W, R, 4).scaleY).toBe(1);
    expect(ballPose(1, W, R, 4).scaleY).toBe(1);
  });

  it('lights up each stop once reached and tracks the active step', () => {
    expect(ballPose(0, W, R, 4).lit).toEqual([1, 0, 0, 0]);
    const mid = ballPose(0.5, W, R, 4);
    expect(mid.lit.slice(0, 2)).toEqual([1, 1]);
    expect(mid.lit[3]).toBe(0);
    expect(ballPose(0.2, W, R, 4).active).toBe(0); // between stops 1 and 2: still on step 1
    expect(ballPose(1 / 3, W, R, 4).active).toBe(1);
    expect(ballPose(1, W, R, 4).active).toBe(3);
  });
});

describe('Reveal', () => {
  let callback: IntersectionObserverCallback | undefined;
  const disconnect = vi.fn();

  afterEach(() => {
    vi.unstubAllGlobals();
    callback = undefined;
  });

  it('starts hidden and animates in once it scrolls into view', () => {
    vi.stubGlobal(
      'IntersectionObserver',
      vi.fn((cb: IntersectionObserverCallback) => {
        callback = cb;
        return { observe: vi.fn(), disconnect, unobserve: vi.fn(), takeRecords: vi.fn() };
      }),
    );
    render(
      <Reveal variant="pop" delay={120}>
        <p>Hello</p>
      </Reveal>,
    );
    const wrapper = screen.getByText('Hello').parentElement!;
    expect(wrapper).toHaveAttribute('data-reveal', 'pop');
    expect(wrapper).toHaveAttribute('data-inview', 'false');
    expect(wrapper.style.getPropertyValue('--reveal-delay')).toBe('120ms');
    act(() =>
      callback?.(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      ),
    );
    expect(wrapper).toHaveAttribute('data-inview', 'true');
    expect(disconnect).toHaveBeenCalled();
  });

  it('shows content immediately when IntersectionObserver is unavailable', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    render(<Reveal>Visible</Reveal>);
    expect(screen.getByText('Visible')).toHaveAttribute('data-inview', 'true');
  });
});

describe('RollingSteps', () => {
  afterEach(() => vi.restoreAllMocks());

  it('renders a static list of steps for reduced motion', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (query: string) =>
        ({
          matches: query.includes('reduce'),
          media: query,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        }) as unknown as MediaQueryList,
    );
    render(<RollingSteps />);
    expect(
      screen.getByRole('heading', { name: 'From messy UI to design system in four steps' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
    expect(screen.queryByText('Scroll to roll →')).not.toBeInTheDocument();
  });

  it('marks the current step for assistive tech in the animated scene', () => {
    render(<RollingSteps />);
    // jsdom has no layout, so the scene's scroll position is arbitrary: check the contract, not the step.
    expect(screen.getByText(/^Step [1-4] of 4: /)).toBeInTheDocument();
    expect(
      screen.getAllByRole('listitem').filter((li) => li.getAttribute('aria-current') === 'step'),
    ).toHaveLength(1);
    expect(screen.getByText('Scroll to roll →')).toBeInTheDocument();
  });
});
