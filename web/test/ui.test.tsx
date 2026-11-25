import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { useState } from 'react';
import { Inbox } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import {
  Badge,
  Button,
  Card,
  CodeBlock,
  ColorSwatch,
  ComponentPreview,
  EmptyState,
  Input,
  ProgressSteps,
  ScoreRing,
  StatCard,
  Tabs,
  ToastProvider,
  useToast,
} from '@/components/ui';

describe('Button', () => {
  it('renders variants, handles clicks and is accessible', async () => {
    const onClick = vi.fn();
    const { container } = render(
      <>
        <Button onClick={onClick}>Save</Button>
        <Button variant="danger" size="sm">
          Delete
        </Button>
      </>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'button');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('is disabled and busy while loading', () => {
    render(<Button loading>Scan</Button>);
    const btn = screen.getByRole('button', { name: 'Scan' });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
  });
});

describe('Input', () => {
  it('links label, helper and error text', async () => {
    const { container, rerender } = render(<Input label="Email" helperText="We never share it" />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAccessibleDescription('We never share it');
    rerender(<Input label="Email" error="Enter a valid email" />);
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid email');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('keeps a hidden label for screen readers', () => {
    render(<Input label="Website URL" hideLabel />);
    expect(screen.getByLabelText('Website URL')).toBeInTheDocument();
  });
});

describe('Card and Badge', () => {
  it('render semantic elements', async () => {
    const { container } = render(
      <ul>
        <Card as="li" variant="interactive">
          <Badge tone="success">Consistent</Badge>
        </Card>
      </ul>,
    );
    expect(screen.getByRole('listitem')).toHaveTextContent('Consistent');
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('Tabs', () => {
  function Harness() {
    const [value, setValue] = useState('a');
    return (
      <Tabs
        label="Types"
        value={value}
        onChange={setValue}
        items={[
          { id: 'a', label: 'A' },
          { id: 'b', label: 'B' },
          { id: 'c', label: 'C' },
        ]}
      >
        Panel {value}
      </Tabs>
    );
  }

  it('supports arrow, Home and End keys with roving tabindex', async () => {
    const { container } = render(<Harness />);
    const [a, b, c] = screen.getAllByRole('tab');
    expect(a).toHaveAttribute('aria-selected', 'true');
    expect(b).toHaveAttribute('tabindex', '-1');
    a!.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(b).toHaveFocus();
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Panel b');
    await userEvent.keyboard('{End}');
    expect(c).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{ArrowRight}');
    expect(a).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(c).toHaveFocus();
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('ScoreRing', () => {
  it('exposes the score and label, not just color', async () => {
    const { container } = render(<ScoreRing value={42.4} />);
    expect(
      screen.getByRole('img', { name: 'Consistency score 42 out of 100: Chaotic' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Chaotic')).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('clamps values', () => {
    render(<ScoreRing value={140} />);
    expect(screen.getByRole('img')).toHaveAccessibleName(/100 out of 100: Consistent/);
  });
});

describe('StatCard', () => {
  it('shows title, value and suggestion', async () => {
    const { container } = render(
      <StatCard
        title="Buttons"
        value="14 variants"
        suggestion="→ suggest 3"
        tone="danger"
        toneLabel="Chaotic"
      />,
    );
    expect(screen.getByRole('heading', { name: 'Buttons' })).toBeInTheDocument();
    expect(screen.getByText('→ suggest 3')).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('CodeBlock', () => {
  it('copies code to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const { container } = render(<CodeBlock code=":root{}" language="css" filename="tokens.css" />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy tokens.css' }));
    await screen.findByRole('button', { name: 'Copied' });
    expect(writeText).toHaveBeenCalledWith(':root{}');
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('ProgressSteps', () => {
  it('marks the current step', async () => {
    const { container } = render(
      <ProgressSteps steps={['Queued', 'Crawling', 'Done']} current={1} />,
    );
    expect(screen.getByText('Crawling').closest('li')).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText('(complete)', { exact: false })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('shows a failed state', () => {
    render(<ProgressSteps steps={['Queued', 'Crawling']} current={1} failed />);
    expect(screen.getByText('(failed)', { exact: false })).toBeInTheDocument();
  });
});

describe('EmptyState', () => {
  it('renders title, description and action', async () => {
    const { container } = render(
      <EmptyState
        icon={Inbox}
        title="No scans yet"
        description="Run one"
        action={<Button>Scan</Button>}
      />,
    );
    expect(screen.getByRole('heading', { name: 'No scans yet' })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('Toast', () => {
  function Trigger() {
    const toast = useToast();
    return <Button onClick={() => toast('success', 'Copied!')}>Notify</Button>;
  }

  it('announces messages politely and can be dismissed', async () => {
    vi.useFakeTimers();
    const { container } = render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Notify' }));
    expect(screen.getByRole('status')).toHaveTextContent('Copied!');
    vi.useRealTimers();
    expect(await axe(container)).toHaveNoViolations();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
    expect(screen.queryByText('Copied!')).not.toBeInTheDocument();
  });

  it('auto-dismisses after 5 seconds', () => {
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Notify' }));
    act(() => vi.advanceTimersByTime(5100));
    expect(screen.queryByText('Copied!')).not.toBeInTheDocument();
    vi.useRealTimers();
  });
});

describe('ColorSwatch', () => {
  it('shows hex, usage and merged colors', async () => {
    const { container } = render(
      <ColorSwatch hex="#4f46e5" count={12} merged={['#4f46e5', '#5047e6']} />,
    );
    expect(screen.getByText('#4f46e5')).toBeInTheDocument();
    expect(screen.getByText(/merged 1 near-identical/)).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('ComponentPreview', () => {
  it('renders captured styles inertly and hidden from assistive tech', async () => {
    const { container } = render(
      <ComponentPreview
        type="button"
        text="Buy now"
        styles={{
          bg: '#4f46e5',
          color: '#ffffff',
          radius: '6px',
          paddingY: '8px',
          paddingX: '16px',
        }}
      />,
    );
    const label = screen.getByText('Buy now');
    expect(label).toHaveStyle({
      backgroundColor: '#4f46e5',
      borderRadius: '6px',
      padding: '8px 16px',
    });
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
    expect(await axe(container)).toHaveNoViolations();
  });
});
