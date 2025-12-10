import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  icon: string;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Simple & Intuitive',
    icon: '✨',
    description: (
      <>
        The simplest way to visualize hierarchical data. Click to expand, 
        drag to reorganize, and navigate effortlessly with keyboard or mouse.
      </>
    ),
  },
  {
    title: 'Accessible by Design',
    icon: '♿',
    description: (
      <>
        Built with accessibility (a11y) at its core. Full keyboard navigation, 
        ARIA labels, screen reader support, and visible focus indicators.
      </>
    ),
  },
  {
    title: 'Human-Readable YAML',
    icon: '📄',
    description: (
      <>
        Import and export data as YAML—designed to be readable and editable 
        by humans, not just machines. No complex JSON or proprietary formats.
      </>
    ),
  },
  {
    title: 'Edit in Real-Time',
    icon: '⚡',
    description: (
      <>
        Optional built-in editor lets you modify your chart data directly
        and see changes instantly. Perfect for quick updates and collaboration.
      </>
    ),
  },
  {
    title: 'Flexible Views',
    icon: '🔀',
    description: (
      <>
        Switch between tree hierarchy and force-directed graph layouts.
        Zoom, pan, and explore your data the way that works best for you.
      </>
    ),
  },
  {
    title: 'Easy Integration',
    icon: '🔌',
    description: (
      <>
        Drop into any project—vanilla JS, React, Vue, Angular, or Svelte.
        A clean API that gets out of your way.
      </>
    ),
  },
];

function Feature({title, icon, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <span className={styles.featureIcon} role="img" aria-hidden="true">{icon}</span>
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
