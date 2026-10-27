// Мини-обёртки над React.createElement: новые модули написаны без JSX.
import { createElement as h, Fragment } from 'react';

const t = (tag) => (props, ...kids) => h(tag, props, ...kids);
export { h, Fragment };
export const div = t('div'), span = t('span'), button = t('button'), label = t('label'), input = t('input'),
  select = t('select'), option = t('option'), table = t('table'), thead = t('thead'), tbody = t('tbody'),
  tr = t('tr'), th = t('th'), td = t('td'), h2 = t('h2'), h3 = t('h3'), h4 = t('h4'), p = t('p'),
  strong = t('strong'), small = t('small'), section = t('section'), article = t('article'), aside = t('aside'),
  textarea = t('textarea');
export const svg = t('svg'), g = t('g'), polygon = t('polygon'), line = t('line'), circle = t('circle'), txt = t('text');
