const GRADIENTS = [
  ['#8a5be0','#e0a64a'],
  ['#4f8fe0','#8a5be0'],
  ['#e0689a','#7b46c9'],
  ['#35a37a','#3b6fd0'],
  ['#e08b4a','#c04a8a'],
];

export function avatarGradient(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h += name.charCodeAt(i);
  return GRADIENTS[h % GRADIENTS.length];
}

export function initials(name) {
  return name.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
}
