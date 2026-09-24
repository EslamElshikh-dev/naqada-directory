'use client';

import type { CSSProperties } from 'react';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  developerProjectFilters,
  developerProjects,
  type DeveloperProjectFilter,
  type DeveloperProjectTheme,
} from '@/lib/developer-profile';
import styles from '@/app/knowledge/developer/developer.module.css';

const themeClassNames: Record<DeveloperProjectTheme, string> = {
  usayrat: styles.projectUsayrat,
  naqada: styles.projectNaqada,
  tawod: styles.projectTawod,
  sama: styles.projectSama,
  bowdy: styles.projectBowdy,
};

export function DeveloperWorkShowcase() {
  const [activeFilter, setActiveFilter] = useState<DeveloperProjectFilter>('all');
  const visibleProjects = activeFilter === 'all'
    ? developerProjects
    : developerProjects.filter((project) => project.category === activeFilter);

  return (
    <section id="selected-work" className={styles.workSection} aria-labelledby="selected-work-title">
      <div className={`shell ${styles.workInner}`}>
        <header className={styles.workHeader}>
          <div>
            <p className={styles.kicker}>من العسيرات لنقادة... وأبعد</p>
            <h2 id="selected-work-title">خمس حكايات،<br /><em>وكل واحدة لها ناسها.</em></h2>
          </div>
          <p>بدأت بالأقرب لقلبي: دليل العسيرات. وبعده دليل نقادة ومشروعات في المقاولات والصحة والتقنية. افتح أي مشروع وشوفه بنفسك.</p>
        </header>

        <div className={styles.workToolbar} aria-label="تصفية الأعمال المختارة">
          <div className={styles.workFilters} role="group" aria-label="نوع المشروع">
            {developerProjectFilters.map((filter) => {
              const count = filter.id === 'all'
                ? developerProjects.length
                : developerProjects.filter((project) => project.category === filter.id).length;

              return (
                <button
                  key={filter.id}
                  type="button"
                  className={styles.filterButton}
                  aria-pressed={activeFilter === filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                >
                  <span>{filter.label}</span>
                  <small>{count.toLocaleString('ar-EG')}</small>
                </button>
              );
            })}
          </div>
          <p className={styles.workCount} aria-live="polite">
            <span>{visibleProjects.length.toLocaleString('ar-EG')}</span>
            {visibleProjects.length === 1 ? ' مشروع مختار' : ' مشروعات مختارة'}
          </p>
        </div>

        <div className={styles.projectsGrid}>
          {visibleProjects.map((project, index) => {
            const content = (
              <>
                <div className={`${styles.projectVisual} ${themeClassNames[project.theme]}`}>
                  <Image
                    className={styles.projectImage}
                    src={project.image}
                    alt={project.imageAlt}
                    fill
                    sizes="(max-width: 720px) 100vw, (max-width: 1100px) 50vw, 560px"
                    unoptimized={project.image.endsWith('.svg')}
                  />
                  <div className={styles.projectScrim} aria-hidden="true" />
                  <div className={styles.browserBar}><i /><i /><i /><span>0{index + 1}</span></div>
                  <div className={styles.projectVisualCopy}>
                    <span>{project.brand}</span>
                    <b>{project.headline[0]}<br />{project.headline[1]}</b>
                    <i>{project.action}</i>
                  </div>
                </div>
                <div className={styles.projectMeta}>
                  <div className={styles.projectMetaTop}><span>{project.code}</span><small dir="ltr">CASE 0{index + 1}</small></div>
                  <h3>{project.title}</h3>
                  <p>{project.description}</p>
                  <div className={styles.projectHighlights} aria-label={`محاور مشروع ${project.title}`}>
                    {project.highlights.map((highlight) => <small key={highlight}>{highlight}</small>)}
                  </div>
                  <b>فتح المشروع <span aria-hidden="true">{project.external ? '↗' : '←'}</span></b>
                </div>
              </>
            );
            const cardStyle = { '--project-order': index } as CSSProperties;

            return project.external ? (
              <a key={project.title} href={project.href} target="_blank" rel="noreferrer" className={styles.projectCard} style={cardStyle}>
                {content}
              </a>
            ) : (
              <Link key={project.title} href={project.href} className={styles.projectCard} style={cardStyle}>
                {content}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
