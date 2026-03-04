import '../styles/main.css';
import { initI18n } from '../lib/i18n.js';
import { ODEMIRA } from '../lib/wiki-data.js';

initI18n();

// Populate featured commons card from ODEMIRA data
const fcName = document.getElementById('fc-name');
const fcLocation = document.getElementById('fc-location');
const fcArea = document.getElementById('fc-area');
const fcPop = document.getElementById('fc-pop');
if (fcName) fcName.textContent = ODEMIRA.name;
if (fcLocation) fcLocation.textContent = ODEMIRA.subtitle;
if (fcArea) fcArea.textContent = ODEMIRA.area;
if (fcPop) fcPop.textContent = ODEMIRA.population.toLocaleString();

// Scroll-aware header: transparent on hero, solid once scrolled past
const header = document.querySelector('.header');
if (header) {
    const onScroll = () => {
        if (window.scrollY > 80) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // Run once on load
}

// Smooth scroll for anchor links — center #featured-commons, start for others
document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
        const target = document.querySelector(link.getAttribute('href'));
        if (target) {
            e.preventDefault();
            const isFeatured = link.getAttribute('href') === '#featured-commons';
            target.scrollIntoView({ behavior: 'smooth', block: isFeatured ? 'center' : 'start' });
        }
    });
});

// Mobile hamburger menu
const menuBtn = document.querySelector('.mobile-menu-btn');
const headerNav = document.querySelector('.header-nav');
if (menuBtn && headerNav) {
    menuBtn.addEventListener('click', () => {
        menuBtn.classList.toggle('open');
        headerNav.classList.toggle('open');
    });
    // Close menu when a nav link is clicked
    headerNav.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            menuBtn.classList.remove('open');
            headerNav.classList.remove('open');
        });
    });
}

