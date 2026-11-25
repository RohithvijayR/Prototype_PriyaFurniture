import { CatalogueProduct } from '../../types/catalogue';

const PDF_URL = '/assets/aistudio/bbarber_chairss_8ab8461c.pdf';

export const BARBER_CHAIR_PRODUCTS: CatalogueProduct[] = [
  {
    id: 'barber-chairs-pf-001',
    slug: 'barber-chairs-pf-001',
    productCode: 'PF 001',
    name: 'Multipurpose Unisex Styling Chair — PF 001',
    categoryId: 'barber-chairs',
    categoryLabel: 'Barber Chairs',
    featured: true,
    description:
      'Multipurpose unisex styling chair featuring a reclining back, adjustable pull-out headrest, and locking hydraulic swivel pump on a square base.',
    images: [
      {
        url: '/assets/catalogue/barber-chairs/pf-001.jpg',
        alt: 'Priya Furniture PF 001 two-tone black and brown multipurpose unisex styling chair with hydraulic swivel pump',
        caption: 'PF 001 — Multipurpose unisex reclining styling chair with hydraulic swivel lock.',
      },
    ],
    features: [
      'Multipurpose unisex styling chair with reclining back',
      'Adjustable pull-out headrest',
      'Hydraulic swivel pump with locking',
    ],
    specifications: [
      { label: 'Lift Mechanism', value: 'Hydraulic swivel pump with locking' },
      { label: 'Headrest', value: 'Adjustable pull-out headrest' },
    ],
    customisationOptions: ['Color can be customized according to client preference'],
    pricingLabel: 'Request a Quote',
    sourcePdfUrl: PDF_URL,
    sourcePdfPage: 2,
  },
  {
    id: 'barber-chairs-pf-002',
    slug: 'barber-chairs-pf-002',
    productCode: 'PF 002',
    name: 'Quilted Unisex Styling Chair — PF 002',
    categoryId: 'barber-chairs',
    categoryLabel: 'Barber Chairs',
    description:
      'Diamond-quilted multipurpose unisex styling chair with reclining backrest, adjustable pull-out headrest, and locking hydraulic swivel pump.',
    images: [
      {
        url: '/assets/catalogue/barber-chairs/pf-002.jpg',
        alt: 'Priya Furniture PF 002 quilted dark green and black unisex styling chair with hydraulic base',
        caption: 'PF 002 — Quilted multipurpose unisex styling chair with adjustable pull-out headrest.',
      },
    ],
    features: [
      'Multipurpose unisex styling chair with reclining back',
      'Adjustable pull-out headrest',
      'Hydraulic swivel pump with locking',
    ],
    specifications: [
      { label: 'Lift Mechanism', value: 'Hydraulic swivel pump with locking' },
      { label: 'Headrest', value: 'Adjustable pull-out headrest' },
    ],
    customisationOptions: ['Color can be customized according to client preference'],
    pricingLabel: 'Request a Quote',
    sourcePdfUrl: PDF_URL,
    sourcePdfPage: 3,
  },
  {
    id: 'barber-chairs-pf-003',
    slug: 'barber-chairs-pf-003',
    productCode: 'PF 003',
    name: 'Heavy-Duty Dual-Lever Barber Chair — PF 003',
    categoryId: 'barber-chairs',
    categoryLabel: 'Barber Chairs',
    featured: true,
    description:
      'Long-lasting barber chair built with an MS footrest, durable side panels, reversible footrest, and smooth 45–55 degree dual-lever recline.',
    images: [
      {
        url: '/assets/catalogue/barber-chairs/pf-003.jpg',
        alt: 'Priya Furniture PF 003 black heavy-duty barber chair with reversible MS footrest and dual recline levers',
        caption: 'PF 003 — Smooth 45–55 degree recline with dual levers and reversible MS footrest.',
      },
    ],
    features: [
      'True representation of a long-lasting barber chair',
      'MS on the footrest and plastic on side panels',
      'Removable and adjustable headrest',
      'Reversible footrest with smooth 45–55 degree recline using dual levers',
    ],
    specifications: [
      { label: 'Recline Angle', value: '45 – 55 degrees (smooth dual levers)' },
      { label: 'Footrest & Side Panels', value: 'MS footrest (reversible) · Plastic side panels' },
      { label: 'Headrest', value: 'Removable and adjustable' },
    ],
    customisationOptions: ['Color can be customized according to client preference'],
    pricingLabel: 'Request a Quote',
    sourcePdfUrl: PDF_URL,
    sourcePdfPage: 4,
  },
  {
    id: 'barber-chairs-pf-004',
    slug: 'barber-chairs-pf-004',
    productCode: 'PF 004',
    name: 'Reclining Multipurpose Barber Chair — PF 004',
    categoryId: 'barber-chairs',
    categoryLabel: 'Barber Chairs',
    description:
      'Textured brown multipurpose reclining chair equipped with a reclining seat, adjustable pull-out headrest, and hydraulic height adjustment.',
    images: [
      {
        url: '/assets/catalogue/barber-chairs/pf-004.jpg',
        alt: 'Priya Furniture PF 004 brown textured multipurpose reclining chair with hydraulic pump',
        caption: 'PF 004 — Reclining multipurpose chair with hydraulic height adjustment.',
      },
    ],
    features: [
      'Reclining multipurpose chair with reclining seat',
      'Adjustable pull-out headrest',
      'Hydraulic pump for height adjustment',
    ],
    specifications: [
      { label: 'Height Adjustment', value: 'Hydraulic pump' },
      { label: 'Headrest', value: 'Adjustable pull-out headrest' },
    ],
    customisationOptions: ['Color can be customized according to client preference'],
    pricingLabel: 'Request a Quote',
    sourcePdfUrl: PDF_URL,
    sourcePdfPage: 5,
  },
  {
    id: 'barber-chairs-pf-005',
    slug: 'barber-chairs-pf-005',
    productCode: 'PF 005',
    name: 'Stainless Steel Support Barber Chair — PF 005',
    categoryId: 'barber-chairs',
    categoryLabel: 'Barber Chairs',
    description:
      'Ergonomically balanced salon chair built with structural steel support, stainless steel armrests, and a durable stainless steel base.',
    images: [
      {
        url: '/assets/catalogue/barber-chairs/pf-005.jpg',
        alt: 'Priya Furniture PF 005 taupe salon chair with stainless steel armrests and base',
        caption: 'PF 005 — Stainless steel armrests and base with supportive seating posture.',
      },
    ],
    features: [
      'Comfortable seating posture with steel support',
      'Stainless steel armrest and durable stainless steel base',
    ],
    specifications: [
      { label: 'Armrests & Base', value: 'Stainless steel armrests · Stainless steel base' },
    ],
    customisationOptions: ['Color can be customized according to client preference'],
    pricingLabel: 'Request a Quote',
    sourcePdfUrl: PDF_URL,
    sourcePdfPage: 6,
  },
  {
    id: 'barber-chairs-pf-006',
    slug: 'barber-chairs-pf-006',
    productCode: 'PF 006',
    name: 'Stainless Steel Armrest Styling Chair — PF 006',
    categoryId: 'barber-chairs',
    categoryLabel: 'Barber Chairs',
    description:
      'Black contoured styling chair featuring steel structural support, stainless steel armrests, and a heavy-duty stainless steel square base.',
    images: [
      {
        url: '/assets/catalogue/barber-chairs/pf-006.jpg',
        alt: 'Priya Furniture PF 006 black styling chair with stainless steel armrests and base',
        caption: 'PF 006 — Steel-supported seating with stainless steel armrests and base.',
      },
    ],
    features: [
      'Comfortable seating posture with steel support',
      'Stainless steel armrest and durable stainless steel base',
    ],
    specifications: [
      { label: 'Armrests & Base', value: 'Stainless steel armrests · Stainless steel base' },
    ],
    customisationOptions: ['Color can be customized according to client preference'],
    pricingLabel: 'Request a Quote',
    sourcePdfUrl: PDF_URL,
    sourcePdfPage: 7,
  },
  {
    id: 'barber-chairs-pf-007',
    slug: 'barber-chairs-pf-007',
    productCode: 'PF 007',
    name: 'Square-Arm Hydraulic Barber Chair — PF 007',
    categoryId: 'barber-chairs',
    categoryLabel: 'Barber Chairs',
    description:
      'Clean-lined black reclining multipurpose chair with metallic armrest caps, adjustable pull-out headrest, and hydraulic height adjustment.',
    images: [
      {
        url: '/assets/catalogue/barber-chairs/pf-007.jpg',
        alt: 'Priya Furniture PF 007 black square-arm reclining multipurpose chair with hydraulic base',
        caption: 'PF 007 — Reclining multipurpose chair with adjustable pull-out headrest.',
      },
    ],
    features: [
      'Reclining multipurpose chair with reclining seat',
      'Adjustable pull-out headrest',
      'Hydraulic pump for height adjustment',
    ],
    specifications: [
      { label: 'Height Adjustment', value: 'Hydraulic pump' },
      { label: 'Headrest', value: 'Adjustable pull-out headrest' },
    ],
    customisationOptions: ['Color can be customized according to client preference'],
    pricingLabel: 'Request a Quote',
    sourcePdfUrl: PDF_URL,
    sourcePdfPage: 8,
  },
  {
    id: 'barber-chairs-pf-008',
    slug: 'barber-chairs-pf-008',
    productCode: 'PF 008',
    name: 'Classic Chrome-Accent Barber Chair — PF 008',
    categoryId: 'barber-chairs',
    categoryLabel: 'Barber Chairs',
    featured: true,
    description:
      'Long-lasting barber chair built for expert shaves and edging, finished with chrome accents, reversible padded footrest, and 45–55 degree dual-lever recline.',
    images: [
      {
        url: '/assets/catalogue/barber-chairs/pf-008.jpg',
        alt: 'Priya Furniture PF 008 ribbed black classic barber chair with chrome side accents and reversible padded footrest',
        caption: 'PF 008 — Chrome accents on footrest and side panels with 45–55° dual-lever recline.',
      },
    ],
    features: [
      'Representation of a long-lasting barber chair built for expert shave and edge services',
      'Chrome accents on the footrest and side panels',
      'Removable and adjustable headrest',
      'Reversible padded footrest with smooth 45–55 degree recline and dual levers',
    ],
    specifications: [
      { label: 'Recline Angle', value: '45 – 55 degrees (dual levers)' },
      { label: 'Accent Finish', value: 'Chrome accents on footrest and side panels' },
      { label: 'Footrest & Headrest', value: 'Reversible padded footrest · Removable adjustable headrest' },
    ],
    customisationOptions: ['Color can be customized according to client preference'],
    pricingLabel: 'Request a Quote',
    sourcePdfUrl: PDF_URL,
    sourcePdfPage: 9,
  },
  {
    id: 'barber-chairs-pf-009',
    slug: 'barber-chairs-pf-009',
    productCode: 'PF 009',
    name: 'Diamond-Side Hydraulic Chair — PF 009',
    categoryId: 'barber-chairs',
    categoryLabel: 'Barber Chairs',
    description:
      'Diamond-quilted side-panel multipurpose reclining chair with pull-out headrest and smooth hydraulic pump height adjustment.',
    images: [
      {
        url: '/assets/catalogue/barber-chairs/pf-009.jpg',
        alt: 'Priya Furniture PF 009 charcoal chair with diamond-stitched outer armrests and chrome square base',
        caption: 'PF 009 — Reclining multipurpose chair with diamond-stitched side panels.',
      },
    ],
    features: [
      'Reclining multipurpose chair with reclining seat',
      'Adjustable pull-out headrest',
      'Hydraulic pump for height adjustment',
    ],
    specifications: [
      { label: 'Height Adjustment', value: 'Hydraulic pump' },
      { label: 'Headrest', value: 'Adjustable pull-out headrest' },
    ],
    customisationOptions: ['Color can be customized according to client preference'],
    pricingLabel: 'Request a Quote',
    sourcePdfUrl: PDF_URL,
    sourcePdfPage: 10,
  },
  {
    id: 'barber-chairs-pf-010',
    slug: 'barber-chairs-pf-010',
    productCode: 'PF 010',
    name: 'Laidback Hydraulic Barber Chair — PF 010',
    categoryId: 'barber-chairs',
    categoryLabel: 'Barber Chairs',
    description:
      'Contoured laidback barber chair designed for comfortable seating posture, paired with an adjustable pull-out headrest and hydraulic pump.',
    images: [
      {
        url: '/assets/catalogue/barber-chairs/pf-010.jpg',
        alt: 'Priya Furniture PF 010 black contoured laidback barber chair with circular chrome base',
        caption: 'PF 010 — Laidback seating posture with pull-out headrest and hydraulic pump.',
      },
    ],
    features: [
      'Laidback design for comfortable seating posture',
      'Adjustable pull-out headrest',
      'Hydraulic pump for height adjustment',
    ],
    specifications: [
      { label: 'Height Adjustment', value: 'Hydraulic pump' },
      { label: 'Headrest', value: 'Adjustable pull-out headrest' },
    ],
    customisationOptions: ['Color can be customized according to client preference'],
    pricingLabel: 'Request a Quote',
    sourcePdfUrl: PDF_URL,
    sourcePdfPage: 11,
  },
  {
    id: 'barber-chairs-pf-011',
    slug: 'barber-chairs-pf-011',
    productCode: 'PF 011',
    name: 'Box-Quilted Hydraulic Styling Chair — PF 011',
    categoryId: 'barber-chairs',
    categoryLabel: 'Barber Chairs',
    description:
      'Modern box-quilted black reclining multipurpose styling chair with pull-out headrest and hydraulic pump height adjustment.',
    images: [
      {
        url: '/assets/catalogue/barber-chairs/pf-011.jpg',
        alt: 'Priya Furniture PF 011 black box-quilted multipurpose reclining chair on square base',
        caption: 'PF 011 — Reclining multipurpose chair with hydraulic height adjustment.',
      },
    ],
    features: [
      'Reclining multipurpose chair with reclining seat',
      'Adjustable pull-out headrest',
      'Hydraulic pump for height adjustment',
    ],
    specifications: [
      { label: 'Height Adjustment', value: 'Hydraulic pump' },
      { label: 'Headrest', value: 'Adjustable pull-out headrest' },
    ],
    customisationOptions: ['Color can be customized according to client preference'],
    pricingLabel: 'Request a Quote',
    sourcePdfUrl: PDF_URL,
    sourcePdfPage: 12,
  },
  {
    id: 'barber-chairs-pf-012',
    slug: 'barber-chairs-pf-012',
    productCode: 'PF 012',
    name: 'Smooth-Profile Hydraulic Chair — PF 012',
    categoryId: 'barber-chairs',
    categoryLabel: 'Barber Chairs',
    description:
      'Minimalist matte-charcoal reclining multipurpose chair featuring an adjustable pull-out headrest and hydraulic pump for height adjustment.',
    images: [
      {
        url: '/assets/catalogue/barber-chairs/pf-012.jpg',
        alt: 'Priya Furniture PF 012 smooth charcoal multipurpose reclining chair on chrome base',
        caption: 'PF 012 — Smooth-profile reclining multipurpose chair with hydraulic pump.',
      },
    ],
    features: [
      'Reclining multipurpose chair with reclining seat',
      'Adjustable pull-out headrest',
      'Hydraulic pump for height adjustment',
    ],
    specifications: [
      { label: 'Height Adjustment', value: 'Hydraulic pump' },
      { label: 'Headrest', value: 'Adjustable pull-out headrest' },
    ],
    customisationOptions: ['Color can be customized according to client preference'],
    pricingLabel: 'Request a Quote',
    sourcePdfUrl: PDF_URL,
    sourcePdfPage: 13,
  },
  {
    id: 'barber-chairs-pf-013',
    slug: 'barber-chairs-pf-013',
    productCode: 'PF 013',
    name: 'Manual-Tilt Steel Frame Barber Chair — PF 013',
    categoryId: 'barber-chairs',
    categoryLabel: 'Barber Chairs',
    description:
      'Practical steel-frame barber chair with manually tilting backrest, manually adjustable headrest, and durable steel handle and footrest.',
    images: [
      {
        url: '/assets/catalogue/barber-chairs/pf-013.jpg',
        alt: 'Priya Furniture PF 013 manual-tilt barber chair with steel frame, handle, and footrest',
        caption: 'PF 013 — Manual-tilt backrest and headrest with steel handle and steel footrest.',
      },
    ],
    features: [
      'Backrest tilted manually',
      'Steel handle and steel footrest',
      'Headrest adjustable manually',
    ],
    specifications: [
      { label: 'Recline & Headrest', value: 'Manual backrest tilt · Manual headrest adjustment' },
      { label: 'Frame Components', value: 'Steel handle and steel footrest' },
    ],
    customisationOptions: ['Color can be customized according to client preference'],
    pricingLabel: 'Request a Quote',
    sourcePdfUrl: PDF_URL,
    sourcePdfPage: 14,
  },
  {
    id: 'barber-chairs-pf-014',
    slug: 'barber-chairs-pf-014',
    productCode: 'PF 014',
    name: 'Heavy-Weight Hydraulic Barber Chair — PF 014',
    categoryId: 'barber-chairs',
    categoryLabel: 'Barber Chairs',
    description:
      'Heavy-duty matte black barber chair built on a heavy-weight hydraulic and base with MS footrest and smooth 45–55 degree dual-lever recline.',
    images: [
      {
        url: '/assets/catalogue/barber-chairs/pf-014.jpg',
        alt: 'Priya Furniture PF 014 matte black heavy-weight hydraulic barber chair with MS footrest',
        caption: 'PF 014 — Heavy-weight hydraulic and base with reversible MS footrest.',
      },
    ],
    features: [
      'True representation of a long-lasting barber chair',
      'MS on the footrest',
      'Heavy-weight hydraulic and base',
      'Removable and adjustable headrest',
      'Reversible footrest with smooth 45–55 degree recline and dual levers',
    ],
    specifications: [
      { label: 'Base & Lift', value: 'Heavy-weight hydraulic and base' },
      { label: 'Recline Angle', value: '45 – 55 degrees (dual levers)' },
      { label: 'Footrest', value: 'MS reversible footrest' },
    ],
    customisationOptions: ['Color can be customized according to client preference'],
    pricingLabel: 'Request a Quote',
    sourcePdfUrl: PDF_URL,
    sourcePdfPage: 15,
  },
  {
    id: 'barber-chairs-pf-015',
    slug: 'barber-chairs-pf-015',
    productCode: 'PF 015',
    name: 'Quilted Chrome-Footrest Barber Chair — PF 015',
    categoryId: 'barber-chairs',
    categoryLabel: 'Barber Chairs',
    description:
      'Beige diamond-quilted long-lasting barber chair with heavy-weight hydraulic base, chrome footrest, and smooth 45–55 degree dual-lever recline.',
    images: [
      {
        url: '/assets/catalogue/barber-chairs/pf-015.jpg',
        alt: 'Priya Furniture PF 015 sand-beige diamond-quilted barber chair with chrome footrest',
        caption: 'PF 015 — Chrome footrest, heavy-weight hydraulic base, and 45–55° dual-lever recline.',
      },
    ],
    features: [
      'True representation of a long-lasting barber chair',
      'Chrome on the footrest',
      'Heavy-weight hydraulic and base',
      'Removable and adjustable headrest',
      'Reversible footrest with smooth 45–55 degree recline and dual levers',
    ],
    specifications: [
      { label: 'Base & Lift', value: 'Heavy-weight hydraulic and base' },
      { label: 'Recline Angle', value: '45 – 55 degrees (dual levers)' },
      { label: 'Footrest', value: 'Chrome reversible footrest' },
    ],
    customisationOptions: ['Color can be customized according to client preference'],
    pricingLabel: 'Request a Quote',
    sourcePdfUrl: PDF_URL,
    sourcePdfPage: 16,
  },
  {
    id: 'barber-chairs-pf-016',
    slug: 'barber-chairs-pf-016',
    productCode: 'PF 016',
    name: 'Classic Ivory & Black Barber Chair — PF 016',
    categoryId: 'barber-chairs',
    categoryLabel: 'Barber Chairs',
    featured: true,
    description:
      'Channel-stitched ivory and black long-lasting barber chair featuring a chrome footrest, heavy-weight hydraulic base, and 45–55 degree recline.',
    images: [
      {
        url: '/assets/catalogue/barber-chairs/pf-016.jpg',
        alt: 'Priya Furniture PF 016 ivory and black ribbed barber chair with metallic frame and heavy-weight base',
        caption: 'PF 016 — Heavy-weight hydraulic base with chrome footrest and dual-lever recline.',
      },
    ],
    features: [
      'True representation of a long-lasting barber chair',
      'Chrome on the footrest',
      'Heavy-weight hydraulic and base',
      'Removable and adjustable headrest',
      'Reversible footrest with smooth 45–55 degree recline and dual levers',
    ],
    specifications: [
      { label: 'Base & Lift', value: 'Heavy-weight hydraulic and base' },
      { label: 'Recline Angle', value: '45 – 55 degrees (dual levers)' },
      { label: 'Footrest', value: 'Chrome reversible footrest' },
    ],
    customisationOptions: ['Color can be customized according to client preference'],
    pricingLabel: 'Request a Quote',
    sourcePdfUrl: PDF_URL,
    sourcePdfPage: 17,
  },
  {
    id: 'barber-chairs-pf-017',
    slug: 'barber-chairs-pf-017',
    productCode: 'PF 017',
    name: 'Dual-Lever MS-Footrest Barber Chair — PF 017',
    categoryId: 'barber-chairs',
    categoryLabel: 'Barber Chairs',
    description:
      'Long-lasting barber chair with contrasting side panels, MS reversible footrest, removable adjustable headrest, and smooth 45–55 degree recline.',
    images: [
      {
        url: '/assets/catalogue/barber-chairs/pf-017.jpg',
        alt: 'Priya Furniture PF 017 black and silver-accent barber chair with reversible MS footrest',
        caption: 'PF 017 — MS reversible footrest with dual-lever 45–55 degree recline.',
      },
    ],
    features: [
      'True representation of a long-lasting barber chair',
      'MS on the footrest',
      'Removable and adjustable headrest',
      'Reversible footrest with smooth 45–55 degree recline and dual levers',
    ],
    specifications: [
      { label: 'Recline Angle', value: '45 – 55 degrees (dual levers)' },
      { label: 'Footrest & Headrest', value: 'MS reversible footrest · Removable adjustable headrest' },
    ],
    customisationOptions: ['Color can be customized according to client preference'],
    pricingLabel: 'Request a Quote',
    sourcePdfUrl: PDF_URL,
    sourcePdfPage: 18,
  },
  {
    id: 'barber-chairs-pf-018',
    slug: 'barber-chairs-pf-018',
    productCode: 'PF 018',
    name: 'Soft-Cushion Hydraulic Styling Chair — PF 018',
    categoryId: 'barber-chairs',
    categoryLabel: 'Barber Chairs',
    description:
      'Plush leatherette styling chair equipped with a smooth hydraulic pump, gently tilting backrest, and adjustable headrest.',
    images: [
      {
        url: '/assets/catalogue/barber-chairs/pf-018.jpg',
        alt: 'Priya Furniture PF 018 pink leatherette soft-cushion hydraulic styling chair',
        caption: 'PF 018 — Soft-cushion leatherette upholstery with smooth hydraulic pump.',
      },
    ],
    features: [
      'Uses a smooth hydraulic pump to easily raise or lower the seat',
      'Tilts back smoothly with an adjustable headrest',
      'Padded with soft cushion and stylish pink leatherette for maximum comfort',
    ],
    specifications: [
      { label: 'Height Adjustment', value: 'Smooth hydraulic pump' },
      { label: 'Upholstery', value: 'Soft-cushion leatherette (color customizable)' },
    ],
    customisationOptions: ['Color can be customized according to client preference'],
    pricingLabel: 'Request a Quote',
    sourcePdfUrl: PDF_URL,
    sourcePdfPage: 19,
  },
  {
    id: 'barber-chairs-pf-019',
    slug: 'barber-chairs-pf-019',
    productCode: 'PF 019',
    name: 'Double-Pipe Metal Frame Barber Chair — PF 019',
    categoryId: 'barber-chairs',
    categoryLabel: 'Barber Chairs',
    description:
      'Sturdy double-pipe metal frame tilting barber chair designed for enhanced structural durability with an integrated lower footrest step.',
    images: [
      {
        url: '/assets/catalogue/barber-chairs/pf-019.jpg',
        alt: 'Priya Furniture PF 019 black double-pipe metal frame tilting barber chair',
        caption: 'PF 019 — Double-pipe metal frame with backward tilt and lower footrest step.',
      },
    ],
    features: [
      'Built with a double-pipe metal frame for enhanced strength and durability',
      'Easily tilts backward to comfortably position clients',
      'Features a sturdy lower step so clients can rest their feet comfortably',
    ],
    specifications: [
      { label: 'Frame Construction', value: 'Double-pipe metal frame' },
      { label: 'Footrest', value: 'Sturdy integrated lower step' },
    ],
    customisationOptions: ['Color can be customized according to client preference'],
    pricingLabel: 'Request a Quote',
    sourcePdfUrl: PDF_URL,
    sourcePdfPage: 20,
  },
];
