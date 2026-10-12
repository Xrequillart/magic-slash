import type { SVGProps } from 'react'

/**
 * THE DRAWING AT THE TOP OF `WhatsNewDialog` — someone reading the release notes,
 * beside the machine the release came off.
 *
 * IT IS TWO-TONE AND THAT IS WHY IT CAN BE HERE. Every one of its 749 paths was
 * `fill="black"` over a white plate; the plate is gone and the black is
 * `currentColor`, so the line work takes whatever colour the caller sets and the
 * shapes the drawing knocks out — the collar, the shirt buttons, the paper, the
 * bands on the cylinder — are the GROUND showing through.
 *
 * ITS ONE CALLER KEEPS IT ON WHITE, and that is `WhatsNewDialog`'s decision rather
 * than this file's: the cover is a picture, and a picture is the part of a product
 * allowed to stay itself while the page under it follows the theme. So what this
 * buys is not that the drawing MOVES — it is that the dialog under it is free to,
 * which the 2.4MB raster it replaces made impossible. A raster baked against a pale
 * ground can only ever be shown on one, and the whole dialog had to be printed pale
 * to match it. Measured on a dark band it does invert cleanly, and it stays that way
 * for whoever wants it: nothing here names a colour.
 *
 * NO `<title>` AND `aria-hidden` AT THE CALL SITE: it says nothing the dialog's own
 * heading does not, and a screen reader that stops to describe it is a screen reader
 * reading furniture.
 *
 * THE VIEWBOX IS THE DRAWING'S OWN BOX, not the 1280×856 frame it was exported in.
 * Measured: the ink runs 165→1115 across and 65→790 down, so the frame carried about
 * 13% dead margin on every side — which, on a band sized by its height, is 13% of the
 * height spent on nothing. Five units of air are kept on each edge.
 *
 * SPELLED OUT RATHER THAN IMPORTED as a file, which is `brand.tsx`'s rule and this
 * folder's: a `.svg` needs a loader, a loader is per app, and the two halves of this
 * design system do not share a build. A component needs neither.
 */
export function WhatsNewArt(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="160 60 960 735" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M407.9 708.4L409.9 708.4L409.9 710.4L407.9 710.4L407.9 708.4Z" fill="currentColor"/>
      <path d="M403.9 708.4L405.9 708.4L405.9 710.4L403.9 710.4L403.9 708.4Z" fill="currentColor"/>
      <path d="M411.9 708.4L413.9 708.3L413.9 710.3L411.9 710.4L411.9 708.4Z" fill="currentColor"/>
      <path d="M415.8 708.3L417.8 708.3L417.9 710.3L415.9 710.3L415.8 708.3Z" fill="currentColor"/>
      <path d="M401.9 710.4L401.9 708.4H401.1H399.9L399.9 710.4L401.1 710.4L401.9 710.4Z" fill="currentColor"/>
      <path d="M419.8 708.3L421.8 708.2L421.8 710.2L419.8 710.3L419.8 708.3Z" fill="currentColor"/>
      <path d="M368 710L368.1 708L370.1 708L370 710L368 710Z" fill="currentColor"/>
      <path d="M372 710.1L372.1 708.1L374.1 708.1L374 710.1L372 710.1Z" fill="currentColor"/>
      <path d="M396 710.4L396 708.4L398 708.4L398 710.4L396 710.4Z" fill="currentColor"/>
      <path d="M376 710.2L376.1 708.2L378 708.2L378 710.2L376 710.2Z" fill="currentColor"/>
      <path d="M423.8 708.2L425.8 708.2L425.8 710.2L423.8 710.2L423.8 708.2Z" fill="currentColor"/>
      <path d="M380 710.2L380 708.2L382 708.3L382 710.3L380 710.2Z" fill="currentColor"/>
      <path d="M392 710.4L392 708.4L394 708.4L394 710.4L392 710.4Z" fill="currentColor"/>
      <path d="M384 710.3L384 708.3L386 708.3L386 710.3L384 710.3Z" fill="currentColor"/>
      <path d="M388 710.3L388 708.3L390 708.4L390 710.4L388 710.3Z" fill="currentColor"/>
      <path d="M455.6 707.3L457.6 707.2L457.7 709.2L455.7 709.3L455.6 707.3Z" fill="currentColor"/>
      <path d="M463.6 706.9L465.6 706.8L465.7 708.8L463.7 708.9L463.6 706.9Z" fill="currentColor"/>
      <path d="M459.6 707.1L461.6 707L461.7 709L459.7 709.1L459.6 707.1Z" fill="currentColor"/>
      <path d="M467.6 706.7L469.5 706.6L469.7 708.6L467.7 708.7L467.6 706.7Z" fill="currentColor"/>
      <path d="M477.6 708.1L477.5 706.1L475.5 706.2L475.6 708.2L477.6 708.1Z" fill="currentColor"/>
      <path d="M481.6 707.8L481.5 705.8L479.5 705.9L479.6 707.9L481.6 707.8Z" fill="currentColor"/>
      <path d="M364.1 709.9L364.1 707.9L366.1 707.9L366 709.9L364.1 709.9Z" fill="currentColor"/>
      <path d="M471.5 706.5L473.5 706.3L473.6 708.3L471.7 708.4L471.5 706.5Z" fill="currentColor"/>
      <path d="M447.7 707.6L449.7 707.5L449.7 709.5L447.7 709.6L447.7 707.6Z" fill="currentColor"/>
      <path d="M439.7 707.8L441.7 707.8L441.8 709.8L439.8 709.8L439.7 707.8Z" fill="currentColor"/>
      <path d="M435.7 708L437.7 707.9L437.8 709.9L435.8 710L435.7 708Z" fill="currentColor"/>
      <path d="M431.7 708.1L433.7 708L433.8 710L431.8 710L431.7 708.1Z" fill="currentColor"/>
      <path d="M427.8 708.1L429.8 708.1L429.8 710.1L427.8 710.1L427.8 708.1Z" fill="currentColor"/>
      <path d="M451.6 707.4L453.6 707.3L453.7 709.3L451.7 709.4L451.6 707.4Z" fill="currentColor"/>
      <path d="M443.7 707.7L445.7 707.7L445.8 709.6L443.8 709.7L443.7 707.7Z" fill="currentColor"/>
      <path d="M247.8 695.2C247.1 695 246.5 694.8 245.9 694.6L245.2 696.4C245.8 696.7 246.5 696.9 247.1 697.1L247.8 695.2Z" fill="currentColor"/>
      <path d="M286.7 702.7C286 702.6 285.4 702.5 284.7 702.4L284.5 704.4C285.1 704.5 285.8 704.6 286.4 704.6L286.7 702.7Z" fill="currentColor"/>
      <path d="M282.7 702.2C282.1 702.1 281.4 702 280.8 701.9L280.5 703.9C281.1 704 281.8 704 282.5 704.1L282.7 702.2Z" fill="currentColor"/>
      <path d="M278.8 701.6C278.1 701.5 277.5 701.4 276.8 701.4L276.5 703.3C277.2 703.4 277.8 703.5 278.5 703.6L278.8 701.6Z" fill="currentColor"/>
      <path d="M290.6 703.1C290 703 289.3 703 288.6 702.9L288.4 704.9C289.1 704.9 289.7 705 290.4 705.1L290.6 703.1Z" fill="currentColor"/>
      <path d="M298.5 704C297.9 703.9 297.2 703.8 296.6 703.8L296.4 705.7C297 705.8 297.7 705.9 298.3 705.9L298.5 704Z" fill="currentColor"/>
      <path d="M360.1 709.8L360.1 707.8L362.1 707.8L362.1 709.8L360.1 709.8Z" fill="currentColor"/>
      <path d="M294.6 703.5C293.9 703.5 293.3 703.4 292.6 703.3L292.4 705.3C293 705.4 293.7 705.5 294.4 705.5L294.6 703.5Z" fill="currentColor"/>
      <path d="M270.9 700.5C270.3 700.3 269.6 700.2 269 700.1L268.6 702.1C269.3 702.2 269.9 702.3 270.6 702.4L270.9 700.5Z" fill="currentColor"/>
      <path d="M255.4 697.4C254.7 697.2 254.1 697.1 253.4 696.9L252.9 698.8C253.6 699 254.2 699.2 254.9 699.3L255.4 697.4Z" fill="currentColor"/>
      <path d="M251.5 696.4C250.9 696.2 250.2 696 249.6 695.8L249.1 697.7C249.7 697.9 250.3 698.1 251 698.3L251.5 696.4Z" fill="currentColor"/>
      <path d="M244.1 693.8C243.5 693.6 242.9 693.3 242.4 693L241.5 694.8C242 695.1 242.7 695.4 243.3 695.7L244.1 693.8Z" fill="currentColor"/>
      <path d="M302.5 704.3C301.8 704.3 301.2 704.2 300.5 704.1L300.3 706.1C301 706.2 301.6 706.3 302.3 706.3L302.5 704.3Z" fill="currentColor"/>
      <path d="M259.2 698.3C258.6 698.1 257.9 698 257.3 697.8L256.8 699.8C257.5 699.9 258.1 700.1 258.8 700.2L259.2 698.3Z" fill="currentColor"/>
      <path d="M267 699.8C266.3 699.7 265.7 699.6 265.1 699.4L264.7 701.4C265.3 701.5 266 701.6 266.7 701.8L267 699.8Z" fill="currentColor"/>
      <path d="M263.1 699.1C262.4 698.9 261.8 698.8 261.2 698.7L260.8 700.6C261.4 700.8 262.1 700.9 262.7 701L263.1 699.1Z" fill="currentColor"/>
      <path d="M274.9 701.1C274.2 701 273.5 700.9 272.9 700.8L272.6 702.7C273.2 702.8 273.9 702.9 274.6 703L274.9 701.1Z" fill="currentColor"/>
      <path d="M332.2 708.5L332.3 706.6L334.3 706.7L334.1 708.7L332.2 708.5Z" fill="currentColor"/>
      <path d="M344.1 709.1L344.2 707.2L346.2 707.2L346.1 709.2L344.1 709.1Z" fill="currentColor"/>
      <path d="M336.1 708.8L336.3 706.8L338.2 706.9L338.1 708.9L336.1 708.8Z" fill="currentColor"/>
      <path d="M340.1 709L340.2 707L342.2 707.1L342.1 709.1L340.1 709Z" fill="currentColor"/>
      <path d="M348.1 709.3L348.2 707.3L350.2 707.4L350.1 709.4L348.1 709.3Z" fill="currentColor"/>
      <path d="M356.1 709.6L356.1 707.6L358.1 707.7L358.1 709.7L356.1 709.6Z" fill="currentColor"/>
      <path d="M352.1 709.5L352.2 707.5L354.2 707.6L354.1 709.6L352.1 709.5Z" fill="currentColor"/>
      <path d="M314.4 705.3L312.4 705.2L312.3 707.2L314.2 707.3L314.4 705.3Z" fill="currentColor"/>
      <path d="M306.5 704.7C305.8 704.6 305.1 704.6 304.5 704.5L304.3 706.5C305 706.6 305.6 706.6 306.3 706.7L306.5 704.7Z" fill="currentColor"/>
      <path d="M318.4 705.6L316.4 705.5L316.2 707.5L318.2 707.6L318.4 705.6Z" fill="currentColor"/>
      <path d="M310.4 705C309.8 705 309.1 704.9 308.4 704.9L308.3 706.9C308.9 706.9 309.6 707 310.3 707L310.4 705Z" fill="currentColor"/>
      <path d="M330.3 706.4L328.3 706.3L328.2 708.3L330.2 708.4L330.3 706.4Z" fill="currentColor"/>
      <path d="M322.3 705.9L320.4 705.8L320.2 707.8L322.2 707.9L322.3 705.9Z" fill="currentColor"/>
      <path d="M326.3 706.2L324.3 706.1L324.2 708L326.2 708.2L326.3 706.2Z" fill="currentColor"/>
      <path d="M555.6 696.9L555 695C554.4 695.2 553.8 695.5 553.1 695.7L553.7 697.6C554.4 697.3 555 697.1 555.6 696.9Z" fill="currentColor"/>
      <path d="M551.8 698.1L551.2 696.2C550.6 696.4 550 696.6 549.3 696.8L549.8 698.7C550.5 698.5 551.2 698.3 551.8 698.1Z" fill="currentColor"/>
      <path d="M547.9 699.2L547.4 697.2C546.8 697.4 546.2 697.6 545.5 697.7L545.9 699.6C546.6 699.5 547.3 699.3 547.9 699.2Z" fill="currentColor"/>
      <path d="M559.4 695.4L558.6 693.6C558 693.9 557.4 694.1 556.8 694.4L557.5 696.2C558.2 695.9 558.8 695.7 559.4 695.4Z" fill="currentColor"/>
      <path d="M540.1 700.9L539.7 698.9L539.2 699L539.6 701L540.1 700.9Z" fill="currentColor"/>
      <path d="M544 700.1L543.6 698.1C542.9 698.3 542.3 698.4 541.6 698.6L542 700.5C542.7 700.4 543.4 700.2 544 700.1Z" fill="currentColor"/>
      <path d="M517.2 714.9C519.6 714.5 521.7 713.2 523.3 711.5C525 709.7 526 707.4 526.2 705C526.5 702.6 526 700.2 524.7 698.1C523.5 696.1 521.7 694.4 519.5 693.5C517.3 692.5 514.8 692.3 512.5 692.8C510.1 693.3 508 694.6 506.4 696.4C504.8 698.2 503.9 700.4 503.7 702.8C503.4 705.2 504 707.6 505.2 709.7C506.5 711.7 508.3 713.3 510.4 714.2C512.6 715.1 514.9 715.4 517.2 714.9ZM507.8 699.5C508.5 698.3 509.5 697.4 510.6 696.7C511.8 696 513 695.6 514.4 695.5C515.7 695.4 517 695.6 518.3 696.2C519.5 696.7 520.6 697.5 521.4 698.5C522 699.2 522.4 700 522.8 700.8C523.2 702.1 523.4 703.5 523.2 704.9C523.1 706.3 522.5 707.6 521.7 708.7C520.7 710.1 519.4 711.1 517.9 711.7C516.3 712.3 514.5 712.4 512.8 711.9C511.1 711.5 509.6 710.5 508.5 709.2C507.4 707.8 506.7 706.2 506.6 704.4C506.5 702.7 506.9 701 507.8 699.5Z" fill="currentColor"/>
      <path d="M310.4 615.1C309.8 615.1 309.1 615 308.4 615L308.3 617C308.9 617 309.6 617.1 310.3 617.1L310.4 615.1Z" fill="currentColor"/>
      <path d="M302.5 614.5C301.8 614.4 301.2 614.3 300.5 614.3L300.3 616.2C301 616.3 301.7 616.4 302.3 616.4L302.5 614.5Z" fill="currentColor"/>
      <path d="M306.5 614.8C305.8 614.8 305.1 614.7 304.5 614.6L304.3 616.6C305 616.7 305.6 616.7 306.3 616.8L306.5 614.8Z" fill="currentColor"/>
      <path d="M290.6 613.2C290 613.2 289.3 613.1 288.6 613L288.4 615C289.1 615.1 289.7 615.1 290.4 615.2L290.6 613.2Z" fill="currentColor"/>
      <path d="M294.6 613.7C293.9 613.6 293.3 613.5 292.6 613.5L292.4 615.4C293 615.5 293.7 615.6 294.4 615.6L294.6 613.7Z" fill="currentColor"/>
      <path d="M298.5 614.1C297.9 614 297.2 613.9 296.6 613.9L296.4 615.9C297 615.9 297.7 616 298.3 616.1L298.5 614.1Z" fill="currentColor"/>
      <path d="M318.4 615.8L316.4 615.6L316.2 617.6L318.2 617.8L318.4 615.8Z" fill="currentColor"/>
      <path d="M286.7 612.8C286 612.7 285.4 612.6 284.7 612.5L284.5 614.5C285.1 614.6 285.8 614.7 286.4 614.7L286.7 612.8Z" fill="currentColor"/>
      <path d="M330.3 616.5L328.3 616.4L328.2 618.4L330.2 618.5L330.3 616.5Z" fill="currentColor"/>
      <path d="M314.4 615.5L312.4 615.3L312.3 617.3L314.2 617.5L314.4 615.5Z" fill="currentColor"/>
      <path d="M326.3 616.3L324.3 616.2L324.2 618.2L326.2 618.3L326.3 616.3Z" fill="currentColor"/>
      <path d="M322.3 616L320.4 615.9L320.2 617.9L322.2 618L322.3 616Z" fill="currentColor"/>
      <path d="M247.8 605.3C247.1 605.1 246.5 604.9 245.9 604.7L245.2 606.6C245.8 606.8 246.5 607 247.1 607.2L247.8 605.3Z" fill="currentColor"/>
      <path d="M251.5 606.5C250.9 606.3 250.2 606.1 249.6 605.9L249.1 607.9C249.7 608 250.3 608.2 251 608.4L251.5 606.5Z" fill="currentColor"/>
      <path d="M255.4 607.5C254.7 607.3 254.1 607.2 253.4 607L252.9 608.9C253.6 609.1 254.2 609.3 254.9 609.4L255.4 607.5Z" fill="currentColor"/>
      <path d="M244.1 604C243.5 603.7 242.9 603.4 242.4 603.1L241.5 604.9C242 605.2 242.7 605.5 243.3 605.8L244.1 604Z" fill="currentColor"/>
      <path d="M259.2 608.4C258.6 608.2 257.9 608.1 257.3 608L256.8 609.9C257.5 610 258.1 610.2 258.8 610.3L259.2 608.4Z" fill="currentColor"/>
      <path d="M332.2 618.7L332.3 616.7L334.3 616.8L334.2 618.8L332.2 618.7Z" fill="currentColor"/>
      <path d="M274.9 611.2C274.2 611.1 273.5 611 272.9 610.9L272.6 612.9C273.2 613 273.9 613.1 274.6 613.2L274.9 611.2Z" fill="currentColor"/>
      <path d="M263.1 609.2C262.4 609.1 261.8 608.9 261.2 608.8L260.8 610.7C261.4 610.9 262.1 611 262.7 611.1L263.1 609.2Z" fill="currentColor"/>
      <path d="M282.7 612.3C282.1 612.2 281.4 612.1 280.8 612L280.5 614C281.1 614.1 281.8 614.2 282.5 614.3L282.7 612.3Z" fill="currentColor"/>
      <path d="M278.8 611.7C278.1 611.7 277.5 611.6 276.8 611.5L276.5 613.4C277.2 613.5 277.8 613.6 278.5 613.7L278.8 611.7Z" fill="currentColor"/>
      <path d="M270.9 610.6C270.3 610.5 269.6 610.4 269 610.2L268.6 612.2C269.3 612.3 269.9 612.4 270.6 612.5L270.9 610.6Z" fill="currentColor"/>
      <path d="M267 609.9C266.3 609.8 265.7 609.7 265.1 609.6L264.7 611.5C265.3 611.6 266 611.8 266.7 611.9L267 609.9Z" fill="currentColor"/>
      <path d="M439.7 618L441.7 617.9L441.8 619.9L439.8 620L439.7 618Z" fill="currentColor"/>
      <path d="M431.7 618.2L433.7 618.1L433.8 620.1L431.8 620.2L431.7 618.2Z" fill="currentColor"/>
      <path d="M427.8 618.3L429.8 618.2L429.8 620.2L427.8 620.3L427.8 618.3Z" fill="currentColor"/>
      <path d="M435.7 618.1L437.7 618L437.8 620L435.8 620.1L435.7 618.1Z" fill="currentColor"/>
      <path d="M336.1 618.9L336.3 616.9L338.2 617L338.1 619L336.1 618.9Z" fill="currentColor"/>
      <path d="M407.9 618.5L409.9 618.5L409.9 620.5L407.9 620.5L407.9 618.5Z" fill="currentColor"/>
      <path d="M415.8 618.4L417.8 618.4L417.9 620.4L415.9 620.4L415.8 618.4Z" fill="currentColor"/>
      <path d="M443.7 617.8L445.7 617.8L445.8 619.8L443.8 619.8L443.7 617.8Z" fill="currentColor"/>
      <path d="M419.8 618.4L421.8 618.4L421.8 620.4L419.8 620.4L419.8 618.4Z" fill="currentColor"/>
      <path d="M423.8 618.3L425.8 618.3L425.8 620.3L423.8 620.3L423.8 618.3Z" fill="currentColor"/>
      <path d="M411.9 618.5L413.9 618.5L413.9 620.5L411.9 620.5L411.9 618.5Z" fill="currentColor"/>
      <path d="M463.6 617L465.6 616.9L465.7 618.9L463.7 619L463.6 617Z" fill="currentColor"/>
      <path d="M467.6 616.8L469.5 616.7L469.7 618.7L467.7 618.8L467.6 616.8Z" fill="currentColor"/>
      <path d="M447.7 617.7L449.7 617.6L449.7 619.6L447.7 619.7L447.7 617.7Z" fill="currentColor"/>
      <path d="M477.6 618.2L477.5 616.2L475.5 616.3L475.6 618.3L477.6 618.2Z" fill="currentColor"/>
      <path d="M471.5 616.6L473.5 616.4L473.6 618.4L471.7 618.6L471.5 616.6Z" fill="currentColor"/>
      <path d="M451.6 617.5L453.6 617.5L453.7 619.5L451.7 619.5L451.6 617.5Z" fill="currentColor"/>
      <path d="M481.6 617.9L481.5 615.9L479.5 616.1L479.6 618.1L481.6 617.9Z" fill="currentColor"/>
      <path d="M459.6 617.2L461.6 617.1L461.7 619.1L459.7 619.2L459.6 617.2Z" fill="currentColor"/>
      <path d="M455.6 617.4L457.6 617.3L457.7 619.3L455.7 619.4L455.6 617.4Z" fill="currentColor"/>
      <path d="M368 620.1L368.1 618.1L370.1 618.2L370 620.2L368 620.1Z" fill="currentColor"/>
      <path d="M348.1 619.4L348.2 617.4L350.2 617.5L350.1 619.5L348.1 619.4Z" fill="currentColor"/>
      <path d="M372 620.2L372.1 618.2L374.1 618.3L374 620.2L372 620.2Z" fill="currentColor"/>
      <path d="M376 620.3L376.1 618.3L378 618.3L378 620.3L376 620.3Z" fill="currentColor"/>
      <path d="M364.1 620L364.1 618L366.1 618.1L366 620.1L364.1 620Z" fill="currentColor"/>
      <path d="M352.1 619.6L352.2 617.6L354.2 617.7L354.1 619.7L352.1 619.6Z" fill="currentColor"/>
      <path d="M360.1 619.9L360.1 617.9L362.1 618L362.1 619.9L360.1 619.9Z" fill="currentColor"/>
      <path d="M344.1 619.3L344.2 617.3L346.2 617.4L346.1 619.4L344.1 619.3Z" fill="currentColor"/>
      <path d="M392 620.5L392 618.5L394 618.5L394 620.5L392 620.5Z" fill="currentColor"/>
      <path d="M396 620.5L396 618.5L398 618.5L398 620.5L396 620.5Z" fill="currentColor"/>
      <path d="M356.1 619.7L356.1 617.8L358.1 617.8L358.1 619.8L356.1 619.7Z" fill="currentColor"/>
      <path d="M340.1 619.1L340.2 617.1L342.2 617.2L342.1 619.2L340.1 619.1Z" fill="currentColor"/>
      <path d="M401.9 620.5L401.9 618.5H401.1H399.9L399.9 620.5L401.1 620.5H401.9Z" fill="currentColor"/>
      <path d="M403.9 618.5L405.9 618.5L405.9 620.5L403.9 620.5L403.9 618.5Z" fill="currentColor"/>
      <path d="M388 620.5L388 618.5L390 618.5L390 620.5L388 620.5Z" fill="currentColor"/>
      <path d="M380 620.4L380 618.4L382 618.4L382 620.4L380 620.4Z" fill="currentColor"/>
      <path d="M384 620.4L384 618.4L386 618.4L386 620.4L384 620.4Z" fill="currentColor"/>
      <path d="M551.8 608.3L551.2 606.3C550.6 606.5 550 606.7 549.3 606.9L549.8 608.8C550.5 608.6 551.2 608.4 551.8 608.3Z" fill="currentColor"/>
      <path d="M559.4 605.5L558.6 603.7C558 604 557.4 604.2 556.8 604.5L557.5 606.3C558.2 606.1 558.8 605.8 559.4 605.5Z" fill="currentColor"/>
      <path d="M547.9 609.3L547.4 607.4C546.8 607.5 546.2 607.7 545.5 607.8L545.9 609.8C546.6 609.6 547.3 609.5 547.9 609.3Z" fill="currentColor"/>
      <path d="M555.6 607L555 605.2C554.4 605.4 553.8 605.6 553.1 605.8L553.7 607.7C554.4 607.5 555 607.2 555.6 607Z" fill="currentColor"/>
      <path d="M544 610.2L543.6 608.3C542.9 608.4 542.3 608.5 541.6 608.7L542 610.6C542.7 610.5 543.4 610.3 544 610.2Z" fill="currentColor"/>
      <path d="M539.2 609.2L539.7 609.1L540.1 611L539.6 611.1L539.2 609.2Z" fill="currentColor"/>
      <path d="M517.2 625.1C519.6 624.6 521.7 623.4 523.3 621.6C525 619.8 526 617.5 526.2 615.1C526.5 612.7 526 610.3 524.7 608.3C523.5 606.2 521.7 604.5 519.5 603.6C517.3 602.6 514.8 602.4 512.5 602.9C510.1 603.4 508 604.7 506.4 606.5C504.8 608.3 503.9 610.6 503.7 613C503.4 615.4 504 617.8 505.2 619.8C506.5 621.8 508.3 623.4 510.4 624.3C512.6 625.3 514.9 625.5 517.2 625.1ZM507.8 609.6C508.5 608.5 509.5 607.5 510.6 606.8C511.8 606.1 513 605.7 514.4 605.6C515.7 605.5 517 605.7 518.3 606.3C519.5 606.8 520.6 607.6 521.4 608.6C522 609.3 522.4 610.1 522.8 610.9C523.2 612.2 523.4 613.6 523.2 615C523.1 616.4 522.5 617.7 521.7 618.9C520.7 620.2 519.4 621.2 517.9 621.8C516.3 622.4 514.5 622.5 512.8 622C511.1 621.6 509.6 620.6 508.5 619.3C507.4 617.9 506.7 616.3 506.6 614.5C506.5 612.8 506.9 611.1 507.8 609.6Z" fill="currentColor"/>
      <path d="M388 530.6L388 528.6L390 528.6L390 530.6L388 530.6Z" fill="currentColor"/>
      <path d="M431.8 528.3L433.7 528.2L433.8 530.2L431.8 530.3L431.8 528.3Z" fill="currentColor"/>
      <path d="M392 530.6L392 528.6L394 528.6L394 530.6L392 530.6Z" fill="currentColor"/>
      <path d="M384 530.5L384 528.5L386 528.6L386 530.6L384 530.5Z" fill="currentColor"/>
      <path d="M439.7 528.1L441.7 528L441.8 530L439.8 530.1L439.7 528.1Z" fill="currentColor"/>
      <path d="M427.8 528.4L429.8 528.3L429.8 530.3L427.8 530.4L427.8 528.4Z" fill="currentColor"/>
      <path d="M435.7 528.2L437.7 528.1L437.8 530.1L435.8 530.2L435.7 528.2Z" fill="currentColor"/>
      <path d="M396 530.6L396 528.6L398 528.6L398 530.6L396 530.6Z" fill="currentColor"/>
      <path d="M419.8 528.5L421.8 528.5L421.8 530.5L419.8 530.5L419.8 528.5Z" fill="currentColor"/>
      <path d="M411.9 528.6L413.9 528.6L413.9 530.6L411.9 530.6L411.9 528.6Z" fill="currentColor"/>
      <path d="M415.8 528.6L417.8 528.5L417.9 530.5L415.9 530.6L415.8 528.6Z" fill="currentColor"/>
      <path d="M403.9 528.6L405.9 528.6L405.9 530.6L403.9 530.6L403.9 528.6Z" fill="currentColor"/>
      <path d="M401.1 528.6H399.9L399.9 530.6H401.1H401.9L401.9 528.6H401.1Z" fill="currentColor"/>
      <path d="M423.8 528.5L425.8 528.4L425.8 530.4L423.8 530.4L423.8 528.5Z" fill="currentColor"/>
      <path d="M407.9 528.6L409.9 528.6L409.9 530.6L407.9 530.6L407.9 528.6Z" fill="currentColor"/>
      <path d="M356.1 529.9L356.1 527.9L358.1 527.9L358.1 529.9L356.1 529.9Z" fill="currentColor"/>
      <path d="M380 530.5L380 528.5L382 528.5L382 530.5L380 530.5Z" fill="currentColor"/>
      <path d="M328.2 528.5L330.2 528.7L330.3 526.7L328.3 526.5L328.2 528.5Z" fill="currentColor"/>
      <path d="M332.2 528.8L332.3 526.8L334.3 526.9L334.2 528.9L332.2 528.8Z" fill="currentColor"/>
      <path d="M340.1 529.2L340.2 527.2L342.2 527.3L342.1 529.3L340.1 529.2Z" fill="currentColor"/>
      <path d="M336.1 529L336.3 527L338.2 527.1L338.1 529.1L336.1 529Z" fill="currentColor"/>
      <path d="M316.2 527.7L318.2 527.9L318.4 525.9L316.4 525.7L316.2 527.7Z" fill="currentColor"/>
      <path d="M320.2 528L322.2 528.1L322.3 526.2L320.4 526L320.2 528Z" fill="currentColor"/>
      <path d="M324.2 528.3L326.2 528.4L326.3 526.4L324.3 526.3L324.2 528.3Z" fill="currentColor"/>
      <path d="M344.1 529.4L344.2 527.4L346.2 527.5L346.1 529.5L344.1 529.4Z" fill="currentColor"/>
      <path d="M372 530.3L372.1 528.3L374.1 528.4L374 530.4L372 530.3Z" fill="currentColor"/>
      <path d="M368 530.2L368.1 528.2L370.1 528.3L370 530.3L368 530.2Z" fill="currentColor"/>
      <path d="M376 530.4L376.1 528.4L378 528.4L378 530.4L376 530.4Z" fill="currentColor"/>
      <path d="M352.1 529.7L352.2 527.7L354.2 527.8L354.1 529.8L352.1 529.7Z" fill="currentColor"/>
      <path d="M348.1 529.6L348.2 527.6L350.2 527.6L350.1 529.6L348.1 529.6Z" fill="currentColor"/>
      <path d="M443.7 528L445.7 527.9L445.8 529.9L443.8 529.9L443.7 528Z" fill="currentColor"/>
      <path d="M364.1 530.1L364.1 528.1L366.1 528.2L366 530.2L364.1 530.1Z" fill="currentColor"/>
      <path d="M360.1 530L360.1 528L362.1 528.1L362.1 530.1L360.1 530Z" fill="currentColor"/>
      <path d="M268.6 522.3C269.3 522.4 269.9 522.5 270.6 522.7L270.9 520.7C270.3 520.6 269.6 520.5 269 520.4L268.6 522.3Z" fill="currentColor"/>
      <path d="M260.8 520.9C261.4 521 262.1 521.1 262.7 521.3L263.1 519.3C262.4 519.2 261.8 519 261.2 518.9L260.8 520.9Z" fill="currentColor"/>
      <path d="M447.7 527.8L449.7 527.7L449.7 529.7L447.7 529.8L447.7 527.8Z" fill="currentColor"/>
      <path d="M272.6 523C273.2 523.1 273.9 523.2 274.6 523.3L274.9 521.3C274.2 521.2 273.5 521.1 272.9 521L272.6 523Z" fill="currentColor"/>
      <path d="M276.5 523.6C277.2 523.7 277.8 523.7 278.5 523.8L278.8 521.9C278.1 521.8 277.5 521.7 276.8 521.6L276.5 523.6Z" fill="currentColor"/>
      <path d="M256.8 520C257.5 520.2 258.1 520.3 258.8 520.5L259.2 518.5C258.6 518.4 257.9 518.2 257.3 518.1L256.8 520Z" fill="currentColor"/>
      <path d="M249.1 518C249.7 518.2 250.3 518.4 251 518.5L251.5 516.6C250.9 516.4 250.2 516.3 249.6 516.1L249.1 518Z" fill="currentColor"/>
      <path d="M252.9 519.1C253.6 519.2 254.2 519.4 254.9 519.6L255.4 517.6C254.7 517.5 254.1 517.3 253.4 517.1L252.9 519.1Z" fill="currentColor"/>
      <path d="M284.5 524.6C285.1 524.7 285.8 524.8 286.4 524.9L286.7 522.9C286 522.8 285.4 522.7 284.7 522.6L284.5 524.6Z" fill="currentColor"/>
      <path d="M288.4 525.1C289.1 525.2 289.7 525.3 290.4 525.3L290.6 523.4C290 523.3 289.3 523.2 288.6 523.1L288.4 525.1Z" fill="currentColor"/>
      <path d="M300.3 526.4C301 526.4 301.7 526.5 302.3 526.6L302.5 524.6C301.8 524.5 301.2 524.4 300.5 524.4L300.3 526.4Z" fill="currentColor"/>
      <path d="M296.4 526C297 526 297.7 526.1 298.3 526.2L298.5 524.2C297.9 524.1 297.2 524.1 296.6 524L296.4 526Z" fill="currentColor"/>
      <path d="M292.4 525.6C293 525.6 293.7 525.7 294.4 525.8L294.6 523.8C293.9 523.7 293.3 523.6 292.6 523.6L292.4 525.6Z" fill="currentColor"/>
      <path d="M280.5 524.1C281.1 524.2 281.8 524.3 282.5 524.4L282.7 522.4C282.1 522.3 281.4 522.2 280.8 522.1L280.5 524.1Z" fill="currentColor"/>
      <path d="M245.2 516.7C245.8 516.9 246.5 517.1 247.1 517.4L247.8 515.5C247.1 515.2 246.5 515 245.9 514.8L245.2 516.7Z" fill="currentColor"/>
      <path d="M312.3 527.4L314.2 527.6L314.4 525.6L312.4 525.4L312.3 527.4Z" fill="currentColor"/>
      <path d="M264.7 521.6C265.3 521.7 266 521.9 266.7 522L267 520C266.3 519.9 265.7 519.8 265.1 519.7L264.7 521.6Z" fill="currentColor"/>
      <path d="M471.5 526.7L473.5 526.6L473.6 528.6L471.7 528.7L471.5 526.7Z" fill="currentColor"/>
      <path d="M467.6 526.9L469.6 526.8L469.7 528.8L467.7 528.9L467.6 526.9Z" fill="currentColor"/>
      <path d="M479.5 526.2L479.6 528.2L481.6 528L481.5 526L479.5 526.2Z" fill="currentColor"/>
      <path d="M463.6 527.1L465.6 527L465.7 529L463.7 529.1L463.6 527.1Z" fill="currentColor"/>
      <path d="M475.5 526.4L475.6 528.4L477.6 528.3L477.5 526.3L475.5 526.4Z" fill="currentColor"/>
      <path d="M451.7 527.7L453.6 527.6L453.7 529.6L451.7 529.7L451.7 527.7Z" fill="currentColor"/>
      <path d="M241.5 515C242 515.3 242.7 515.6 243.3 515.9L244.1 514.1C243.5 513.8 242.9 513.5 242.4 513.2L241.5 515Z" fill="currentColor"/>
      <path d="M455.6 527.5L457.6 527.4L457.7 529.4L455.7 529.5L455.6 527.5Z" fill="currentColor"/>
      <path d="M459.6 527.3L461.6 527.2L461.7 529.2L459.7 529.3L459.6 527.3Z" fill="currentColor"/>
      <path d="M304.3 526.7C305 526.8 305.6 526.9 306.3 526.9L306.5 524.9C305.8 524.9 305.1 524.8 304.5 524.8L304.3 526.7Z" fill="currentColor"/>
      <path d="M308.3 527.1C308.9 527.1 309.6 527.2 310.3 527.3L310.4 525.3C309.8 525.2 309.1 525.2 308.4 525.1L308.3 527.1Z" fill="currentColor"/>
      <path d="M545.5 517.9L545.9 519.9C546.6 519.7 547.3 519.6 547.9 519.4L547.4 517.5C546.8 517.6 546.2 517.8 545.5 517.9Z" fill="currentColor"/>
      <path d="M553.1 515.9L553.7 517.8C554.4 517.6 555 517.4 555.6 517.2L555 515.3C554.4 515.5 553.8 515.7 553.1 515.9Z" fill="currentColor"/>
      <path d="M559.4 515.6L558.6 513.8C558 514.1 557.4 514.3 556.8 514.6L557.5 516.4C558.2 516.2 558.8 515.9 559.4 515.6Z" fill="currentColor"/>
      <path d="M541.6 518.8L542 520.7C542.7 520.6 543.4 520.5 544 520.3L543.6 518.4C542.9 518.5 542.3 518.7 541.6 518.8Z" fill="currentColor"/>
      <path d="M539.2 519.3L539.7 519.2L540.1 521.1L539.6 521.2L539.2 519.3Z" fill="currentColor"/>
      <path d="M549.3 517L549.8 518.9C550.5 518.7 551.2 518.6 551.8 518.4L551.2 516.5C550.6 516.6 550 516.8 549.3 517Z" fill="currentColor"/>
      <path d="M518.8 513.4C516.5 512.6 514 512.5 511.7 513.2C509.4 513.9 507.4 515.3 505.9 517.2C504.5 519.1 503.7 521.5 503.6 523.9C503.6 526.3 504.3 528.6 505.7 530.6C507.1 532.6 509.1 534 511.3 534.8C513.6 535.6 516.1 535.6 518.4 534.9C520.7 534.1 522.7 532.7 524.1 530.8C525.5 528.8 526.3 526.5 526.3 524.1C526.3 521.7 525.6 519.4 524.2 517.5C522.9 515.6 521 514.2 518.8 513.4ZM521.7 529C520.8 530.3 519.4 531.3 517.9 531.9C516.4 532.4 514.9 532.6 513.4 532.3C511.9 532 510.5 531.3 509.3 530.3C508.2 529.2 507.4 527.9 506.9 526.4C506.5 525 506.5 523.4 506.9 521.9C507.3 520.4 508.1 519.1 509.2 518C510.3 517 511.7 516.2 513.2 515.9C514.7 515.6 516.2 515.7 517.7 516.2C519.1 516.7 520.4 517.6 521.4 518.8C522 519.5 522.4 520.2 522.8 521.1C523.2 522.4 523.4 523.8 523.2 525.1C523.1 526.5 522.5 527.8 521.7 529Z" fill="currentColor"/>
      <path d="M724.2 220.3C724.1 220.4 724.1 220.5 724.1 220.6L724 221C724 221.2 724.1 221.5 724.2 221.7C724.4 222.1 724.8 222.5 725.1 222.7C725.3 222.9 725.6 223 725.8 223C726 223.1 726.2 223.1 726.5 223.2C727 223.2 727.4 223.1 727.9 222.9C728.1 222.7 728.2 222.6 728.4 222.5C728.6 222.3 728.7 222.1 728.9 221.9C729.1 221.5 729.3 221.1 729.3 220.6C729.3 220.2 729.3 219.7 729.1 219.3C729 219 728.9 218.7 728.7 218.4C728.5 218.1 728.3 217.9 728.1 217.7C727.8 217.6 727.6 217.4 727.3 217.3C727.1 217.3 727 217.3 726.9 217.2C726.7 217.2 726.6 217.2 726.5 217.2C726.2 217.2 725.9 217.3 725.7 217.3C725.2 217.5 724.8 217.7 724.5 217.9C724.1 218.1 723.9 218.4 723.8 218.8C723.7 219.2 723.7 219.6 723.9 220C724 220.1 724.1 220.2 724.2 220.3Z" fill="currentColor"/>
      <path d="M683.3 226.4C683.3 226.5 683.2 226.6 683.2 226.7L683.1 227.1C683.1 227.4 683.2 227.6 683.3 227.9C683.6 228.3 683.9 228.6 684.3 228.9C684.5 229 684.7 229.1 684.9 229.2C685.1 229.2 685.4 229.3 685.6 229.3C686.1 229.3 686.6 229.2 687 229C687.2 228.9 687.4 228.7 687.5 228.6C687.7 228.4 687.9 228.2 688 228.1C688.3 227.7 688.4 227.2 688.4 226.7C688.5 226.3 688.4 225.9 688.3 225.5C688.1 225.1 688 224.8 687.8 224.5C687.6 224.3 687.4 224.1 687.2 223.9C687 223.7 686.7 223.6 686.4 223.5C686.3 223.4 686.1 223.4 686 223.4C685.9 223.4 685.7 223.3 685.6 223.3C685.3 223.3 685.1 223.4 684.8 223.5C684.4 223.6 684 223.8 683.6 224C683.3 224.2 683 224.6 682.9 224.9C682.8 225.3 682.9 225.7 683.1 226.1C683.1 226.2 683.2 226.3 683.3 226.4Z" fill="currentColor"/>
      <path d="M711.2 197.7C711.4 199 711.9 200.2 712.7 201.3C713.2 201.8 713.9 202.2 714.6 202.3C715.5 202.3 716.3 202.1 717.1 201.7C716.8 201.8 717.4 201.6 717.5 201.6C717.7 201.5 717.9 201.4 718.1 201.3C718.6 201.2 719.1 201 719.6 200.9C720.8 200.6 721.9 200.4 723 200.2C725.6 199.7 728.2 199.6 730.9 199.6C733.1 199.6 735.4 199.9 737.6 200.7C737.8 200.7 738.1 200.8 738.3 200.7C738.5 200.7 738.8 200.5 738.9 200.4C739.3 200.5 739.6 200.4 739.9 200.3C740.2 200.2 740.5 200 740.6 199.7C741.2 198.5 741.5 197.1 741.4 195.8C741.2 194.4 740.8 193.1 740 192C739.3 191 738.5 190.2 737.5 189.6C736.6 189.2 735.8 189 734.9 188.8C732.7 188.4 730.4 188.2 728.2 188.2C726.2 188.2 724.2 188.1 722.2 188.2C720.4 188.2 718.7 188.4 716.9 188.6C715.5 188.8 714.1 189.3 712.9 190.1C710.6 191.9 710.7 195.1 711.2 197.7Z" fill="currentColor"/>
      <path d="M781 234.3C781 234.7 781.2 235.1 781.5 235.4C781.8 235.7 782.1 235.8 782.5 235.8C782.9 235.8 783.3 235.7 783.6 235.4C783.9 235.1 784 234.7 784 234.3C783.7 232.4 783.8 230.4 784.2 228.4C784.4 227 785.3 225.7 786.4 224.8C786.8 224.6 787 224.3 787.1 223.9C787.2 223.5 787.2 223.1 787 222.8C786.8 222.4 786.4 222.2 786.1 222.1C785.7 222 785.3 222 784.9 222.2C783.2 223.4 781.9 225.2 781.4 227.3C780.8 229.6 780.7 232 781 234.3Z" fill="currentColor"/>
      <path d="M339.7 149H461.1C462.7 149 464.4 149 466 149C466.1 149 466.1 149 466.2 149C466.4 149 466.6 148.9 466.8 148.9C466.9 148.8 467.1 148.7 467.2 148.6C467.2 148.6 467.3 148.5 467.3 148.5C467.3 148.5 467.3 148.5 467.3 148.5C467.4 148.4 467.5 148.2 467.6 148C467.7 147.8 467.7 147.7 467.7 147.5V132.5C467.7 132.1 467.5 131.7 467.3 131.4C467 131.1 466.6 131 466.2 131H344.9C343.2 131 341.6 130.9 340 131C339.9 131 339.8 131 339.7 131C339.4 131 339 131.1 338.7 131.4C338.4 131.7 338.3 132.1 338.3 132.5V147.5C338.3 147.9 338.4 148.2 338.7 148.5C339 148.8 339.4 149 339.7 149Z" fill="currentColor"/>
      <path d="M448.9 162.3H450.9V164.3H448.9V162.3Z" fill="currentColor"/>
      <path d="M353.2 162.3H355.2V164.3H353.2V162.3Z" fill="currentColor"/>
      <path d="M512.6 162.3H514.6V164.3H512.6V162.3Z" fill="currentColor"/>
      <path d="M444.9 162.3H446.9V164.3H444.9V162.3Z" fill="currentColor"/>
      <path d="M369.2 162.3H371.2V164.3H369.2V162.3Z" fill="currentColor"/>
      <path d="M516.6 162.3H518.6V164.3H516.6V162.3Z" fill="currentColor"/>
      <path d="M393.1 162.3H395.1V164.3H393.1V162.3Z" fill="currentColor"/>
      <path d="M452.9 162.3H454.9V164.3H452.9V162.3Z" fill="currentColor"/>
      <path d="M349.2 162.3H351.2V164.3H349.2V162.3Z" fill="currentColor"/>
      <path d="M460.8 162.3H462.8V164.3H460.8V162.3Z" fill="currentColor"/>
      <path d="M397.1 162.3H399.1V164.3H397.1V162.3Z" fill="currentColor"/>
      <path d="M456.9 162.3H458.8V164.3H456.9V162.3Z" fill="currentColor"/>
      <path d="M417 162.3H419V164.3H417V162.3Z" fill="currentColor"/>
      <path d="M425 162.3H427V164.3H425V162.3Z" fill="currentColor"/>
      <path d="M405 162.3H407V164.3H405V162.3Z" fill="currentColor"/>
      <path d="M361.2 162.3H363.2V164.3H361.2V162.3Z" fill="currentColor"/>
      <path d="M413 162.3H415V164.3H413V162.3Z" fill="currentColor"/>
      <path d="M508.7 162.3H510.7V164.3H508.7V162.3Z" fill="currentColor"/>
      <path d="M421 162.3H423V164.3H421V162.3Z" fill="currentColor"/>
      <path d="M429 162.3H430.9V164.3H429V162.3Z" fill="currentColor"/>
      <path d="M409 162.3H411V164.3H409V162.3Z" fill="currentColor"/>
      <path d="M357.2 162.3H359.2V164.3H357.2V162.3Z" fill="currentColor"/>
      <path d="M440.9 162.3H442.9V164.3H440.9V162.3Z" fill="currentColor"/>
      <path d="M436.9 162.3H438.9V164.3H436.9V162.3Z" fill="currentColor"/>
      <path d="M365.2 162.3H367.2V164.3H365.2V162.3Z" fill="currentColor"/>
      <path d="M432.9 162.3H434.9V164.3H432.9V162.3Z" fill="currentColor"/>
      <path d="M401.1 162.3H403.1V164.3H401.1V162.3Z" fill="currentColor"/>
      <path d="M472.8 162.3H474.8V164.3H472.8V162.3Z" fill="currentColor"/>
      <path d="M480.8 162.3H482.8V164.3H480.8V162.3Z" fill="currentColor"/>
      <path d="M345.3 162.3H347.3V164.3H345.3V162.3Z" fill="currentColor"/>
      <path d="M484.8 162.3H486.7V164.3H484.8V162.3Z" fill="currentColor"/>
      <path d="M476.8 162.3H478.8V164.3H476.8V162.3Z" fill="currentColor"/>
      <path d="M500.7 162.3H502.7V164.3H500.7V162.3Z" fill="currentColor"/>
      <path d="M373.2 162.3H375.2V164.3H373.2V162.3Z" fill="currentColor"/>
      <path d="M381.1 162.3H383.1V164.3H381.1V162.3Z" fill="currentColor"/>
      <path d="M492.7 162.3H494.7V164.3H492.7V162.3Z" fill="currentColor"/>
      <path d="M341.3 162.3H343.3V164.3H341.3V162.3Z" fill="currentColor"/>
      <path d="M496.7 162.3H498.7V164.3H496.7V162.3Z" fill="currentColor"/>
      <path d="M377.1 162.3H379.1V164.3H377.1V162.3Z" fill="currentColor"/>
      <path d="M488.7 162.3H490.7V164.3H488.7V162.3Z" fill="currentColor"/>
      <path d="M504.7 162.3H506.7V164.3H504.7V162.3Z" fill="currentColor"/>
      <path d="M385.1 162.3H387.1V164.3H385.1V162.3Z" fill="currentColor"/>
      <path d="M468.8 162.3H470.8V164.3H468.8V162.3Z" fill="currentColor"/>
      <path d="M389.1 162.3H391.1V164.3H389.1V162.3Z" fill="currentColor"/>
      <path d="M464.8 162.3H466.8V164.3H464.8V162.3Z" fill="currentColor"/>
      <path d="M464.8 174.8H466.8V176.8H464.8V174.8Z" fill="currentColor"/>
      <path d="M361.2 174.8H363.2V176.8H361.2V174.8Z" fill="currentColor"/>
      <path d="M425 174.8H427V176.8H425V174.8Z" fill="currentColor"/>
      <path d="M452.9 174.8H454.9V176.8H452.9V174.8Z" fill="currentColor"/>
      <path d="M488.7 174.8H490.7V176.8H488.7V174.8Z" fill="currentColor"/>
      <path d="M512.6 174.8H514.6V176.8H512.6V174.8Z" fill="currentColor"/>
      <path d="M496.7 174.8H498.7V176.8H496.7V174.8Z" fill="currentColor"/>
      <path d="M492.7 174.8H494.7V176.8H492.7V174.8Z" fill="currentColor"/>
      <path d="M456.9 174.8H458.8V176.8H456.9V174.8Z" fill="currentColor"/>
      <path d="M460.8 174.8H462.8V176.8H460.8V174.8Z" fill="currentColor"/>
      <path d="M484.8 174.8H486.7V176.8H484.8V174.8Z" fill="currentColor"/>
      <path d="M504.7 174.8H506.7V176.8H504.7V174.8Z" fill="currentColor"/>
      <path d="M421 174.8H423V176.8H421V174.8Z" fill="currentColor"/>
      <path d="M436.9 174.8H438.9V176.8H436.9V174.8Z" fill="currentColor"/>
      <path d="M440.9 174.8H442.9V176.8H440.9V174.8Z" fill="currentColor"/>
      <path d="M448.9 174.8H450.9V176.8H448.9V174.8Z" fill="currentColor"/>
      <path d="M516.6 174.8H518.6V176.8H516.6V174.8Z" fill="currentColor"/>
      <path d="M476.8 174.8H478.8V176.8H476.8V174.8Z" fill="currentColor"/>
      <path d="M429 174.8H430.9V176.8H429V174.8Z" fill="currentColor"/>
      <path d="M444.9 174.8H446.9V176.8H444.9V174.8Z" fill="currentColor"/>
      <path d="M468.8 174.8H470.8V176.8H468.8V174.8Z" fill="currentColor"/>
      <path d="M508.7 174.8H510.7V176.8H508.7V174.8Z" fill="currentColor"/>
      <path d="M500.7 174.8H502.7V176.8H500.7V174.8Z" fill="currentColor"/>
      <path d="M480.8 174.8H482.8V176.8H480.8V174.8Z" fill="currentColor"/>
      <path d="M432.9 174.8H434.9V176.8H432.9V174.8Z" fill="currentColor"/>
      <path d="M365.2 174.8H367.2V176.8H365.2V174.8Z" fill="currentColor"/>
      <path d="M472.8 174.8H474.8V176.8H472.8V174.8Z" fill="currentColor"/>
      <path d="M373.2 174.8H375.2V176.8H373.2V174.8Z" fill="currentColor"/>
      <path d="M369.2 174.8H371.2V176.8H369.2V174.8Z" fill="currentColor"/>
      <path d="M389.1 174.8H391.1V176.8H389.1V174.8Z" fill="currentColor"/>
      <path d="M385.1 174.8H387.1V176.8H385.1V174.8Z" fill="currentColor"/>
      <path d="M345.3 174.8H347.3V176.8H345.3V174.8Z" fill="currentColor"/>
      <path d="M357.2 174.8H359.2V176.8H357.2V174.8Z" fill="currentColor"/>
      <path d="M409 174.8H411V176.8H409V174.8Z" fill="currentColor"/>
      <path d="M353.2 174.8H355.2V176.8H353.2V174.8Z" fill="currentColor"/>
      <path d="M401.1 174.8H403.1V176.8H401.1V174.8Z" fill="currentColor"/>
      <path d="M397.1 174.8H399.1V176.8H397.1V174.8Z" fill="currentColor"/>
      <path d="M405 174.8H407V176.8H405V174.8Z" fill="currentColor"/>
      <path d="M393.1 174.8H395.1V176.8H393.1V174.8Z" fill="currentColor"/>
      <path d="M349.2 174.8H351.2V176.8H349.2V174.8Z" fill="currentColor"/>
      <path d="M381.1 174.8H383.1V176.8H381.1V174.8Z" fill="currentColor"/>
      <path d="M377.1 174.8H379.1V176.8H377.1V174.8Z" fill="currentColor"/>
      <path d="M341.3 174.8H343.3V176.8H341.3V174.8Z" fill="currentColor"/>
      <path d="M413 174.8H415V176.8H413V174.8Z" fill="currentColor"/>
      <path d="M417 174.8H419V176.8H417V174.8Z" fill="currentColor"/>
      <path d="M456.9 187.3H458.8V189.3H456.9V187.3Z" fill="currentColor"/>
      <path d="M393.1 187.3H395.1V189.3H393.1V187.3Z" fill="currentColor"/>
      <path d="M389.1 187.3H391.1V189.3H389.1V187.3Z" fill="currentColor"/>
      <path d="M496.7 187.3H498.7V189.3H496.7V187.3Z" fill="currentColor"/>
      <path d="M492.7 187.3H494.7V189.3H492.7V187.3Z" fill="currentColor"/>
      <path d="M480.8 187.3H482.8V189.3H480.8V187.3Z" fill="currentColor"/>
      <path d="M381.1 187.3H383.1V189.3H381.1V187.3Z" fill="currentColor"/>
      <path d="M512.6 187.3H514.6V189.3H512.6V187.3Z" fill="currentColor"/>
      <path d="M397.1 187.3H399.1V189.3H397.1V187.3Z" fill="currentColor"/>
      <path d="M452.9 187.3H454.9V189.3H452.9V187.3Z" fill="currentColor"/>
      <path d="M349.2 187.3H351.2V189.3H349.2V187.3Z" fill="currentColor"/>
      <path d="M448.9 187.3H450.9V189.3H448.9V187.3Z" fill="currentColor"/>
      <path d="M460.8 187.3H462.8V189.3H460.8V187.3Z" fill="currentColor"/>
      <path d="M369.2 187.3H371.2V189.3H369.2V187.3Z" fill="currentColor"/>
      <path d="M476.8 187.3H478.8V189.3H476.8V187.3Z" fill="currentColor"/>
      <path d="M341.3 187.3H343.3V189.3H341.3V187.3Z" fill="currentColor"/>
      <path d="M500.7 187.3H502.7V189.3H500.7V187.3Z" fill="currentColor"/>
      <path d="M377.1 187.3H379.1V189.3H377.1V187.3Z" fill="currentColor"/>
      <path d="M345.3 187.3H347.3V189.3H345.3V187.3Z" fill="currentColor"/>
      <path d="M484.8 187.3H486.7V189.3H484.8V187.3Z" fill="currentColor"/>
      <path d="M472.8 187.3H474.8V189.3H472.8V187.3Z" fill="currentColor"/>
      <path d="M468.8 187.3H470.8V189.3H468.8V187.3Z" fill="currentColor"/>
      <path d="M508.7 187.3H510.7V189.3H508.7V187.3Z" fill="currentColor"/>
      <path d="M464.8 187.3H466.8V189.3H464.8V187.3Z" fill="currentColor"/>
      <path d="M385.1 187.3H387.1V189.3H385.1V187.3Z" fill="currentColor"/>
      <path d="M504.7 187.3H506.7V189.3H504.7V187.3Z" fill="currentColor"/>
      <path d="M488.7 187.3H490.7V189.3H488.7V187.3Z" fill="currentColor"/>
      <path d="M373.2 187.3H375.2V189.3H373.2V187.3Z" fill="currentColor"/>
      <path d="M405 187.3H407V189.3H405V187.3Z" fill="currentColor"/>
      <path d="M365.2 187.3H367.2V189.3H365.2V187.3Z" fill="currentColor"/>
      <path d="M432.9 187.3H434.9V189.3H432.9V187.3Z" fill="currentColor"/>
      <path d="M353.2 187.3H355.2V189.3H353.2V187.3Z" fill="currentColor"/>
      <path d="M409 187.3H411V189.3H409V187.3Z" fill="currentColor"/>
      <path d="M436.9 187.3H438.9V189.3H436.9V187.3Z" fill="currentColor"/>
      <path d="M425 187.3H427V189.3H425V187.3Z" fill="currentColor"/>
      <path d="M361.2 187.3H363.2V189.3H361.2V187.3Z" fill="currentColor"/>
      <path d="M421 187.3H423V189.3H421V187.3Z" fill="currentColor"/>
      <path d="M417 187.3H419V189.3H417V187.3Z" fill="currentColor"/>
      <path d="M357.2 187.3H359.2V189.3H357.2V187.3Z" fill="currentColor"/>
      <path d="M440.9 187.3H442.9V189.3H440.9V187.3Z" fill="currentColor"/>
      <path d="M413 187.3H415V189.3H413V187.3Z" fill="currentColor"/>
      <path d="M429 187.3H430.9V189.3H429V187.3Z" fill="currentColor"/>
      <path d="M516.6 187.3H518.6V189.3H516.6V187.3Z" fill="currentColor"/>
      <path d="M444.9 187.3H446.9V189.3H444.9V187.3Z" fill="currentColor"/>
      <path d="M401.1 187.3H403.1V189.3H401.1V187.3Z" fill="currentColor"/>
      <path d="M349.2 199.9H351.2V201.9H349.2V199.9Z" fill="currentColor"/>
      <path d="M480.8 199.9H482.8V201.9H480.8V199.9Z" fill="currentColor"/>
      <path d="M373.2 199.9H375.2V201.9H373.2V199.9Z" fill="currentColor"/>
      <path d="M417 199.9H419V201.9H417V199.9Z" fill="currentColor"/>
      <path d="M425 199.9H427V201.9H425V199.9Z" fill="currentColor"/>
      <path d="M476.8 199.9H478.8V201.9H476.8V199.9Z" fill="currentColor"/>
      <path d="M429 199.9H430.9V201.9H429V199.9Z" fill="currentColor"/>
      <path d="M504.7 199.9H506.7V201.9H504.7V199.9Z" fill="currentColor"/>
      <path d="M369.2 199.9H371.2V201.9H369.2V199.9Z" fill="currentColor"/>
      <path d="M361.2 199.9H363.2V201.9H361.2V199.9Z" fill="currentColor"/>
      <path d="M456.9 199.9H458.8V201.9H456.9V199.9Z" fill="currentColor"/>
      <path d="M397.1 199.9H399.1V201.9H397.1V199.9Z" fill="currentColor"/>
      <path d="M341.3 199.9H343.3V201.9H341.3V199.9Z" fill="currentColor"/>
      <path d="M448.9 199.9H450.9V201.9H448.9V199.9Z" fill="currentColor"/>
      <path d="M377.1 199.9H379.1V201.9H377.1V199.9Z" fill="currentColor"/>
      <path d="M492.7 199.9H494.7V201.9H492.7V199.9Z" fill="currentColor"/>
      <path d="M421 199.9H423V201.9H421V199.9Z" fill="currentColor"/>
      <path d="M496.7 199.9H498.7V201.9H496.7V199.9Z" fill="currentColor"/>
      <path d="M357.2 199.9H359.2V201.9H357.2V199.9Z" fill="currentColor"/>
      <path d="M516.6 199.9H518.6V201.9H516.6V199.9Z" fill="currentColor"/>
      <path d="M413 199.9H415V201.9H413V199.9Z" fill="currentColor"/>
      <path d="M484.8 199.9H486.7V201.9H484.8V199.9Z" fill="currentColor"/>
      <path d="M444.9 199.9H446.9V201.9H444.9V199.9Z" fill="currentColor"/>
      <path d="M500.7 199.9H502.7V201.9H500.7V199.9Z" fill="currentColor"/>
      <path d="M488.7 199.9H490.7V201.9H488.7V199.9Z" fill="currentColor"/>
      <path d="M409 199.9H411V201.9H409V199.9Z" fill="currentColor"/>
      <path d="M393.1 199.9H395.1V201.9H393.1V199.9Z" fill="currentColor"/>
      <path d="M365.2 199.9H367.2V201.9H365.2V199.9Z" fill="currentColor"/>
      <path d="M345.3 199.9H347.3V201.9H345.3V199.9Z" fill="currentColor"/>
      <path d="M464.8 199.9H466.8V201.9H464.8V199.9Z" fill="currentColor"/>
      <path d="M508.7 199.9H510.7V201.9H508.7V199.9Z" fill="currentColor"/>
      <path d="M436.9 199.9H438.9V201.9H436.9V199.9Z" fill="currentColor"/>
      <path d="M389.1 199.9H391.1V201.9H389.1V199.9Z" fill="currentColor"/>
      <path d="M512.6 199.9H514.6V201.9H512.6V199.9Z" fill="currentColor"/>
      <path d="M440.9 199.9H442.9V201.9H440.9V199.9Z" fill="currentColor"/>
      <path d="M401.1 199.9H403.1V201.9H401.1V199.9Z" fill="currentColor"/>
      <path d="M460.8 199.9H462.8V201.9H460.8V199.9Z" fill="currentColor"/>
      <path d="M385.1 199.9H387.1V201.9H385.1V199.9Z" fill="currentColor"/>
      <path d="M472.8 199.9H474.8V201.9H472.8V199.9Z" fill="currentColor"/>
      <path d="M432.9 199.9H434.9V201.9H432.9V199.9Z" fill="currentColor"/>
      <path d="M353.2 199.9H355.2V201.9H353.2V199.9Z" fill="currentColor"/>
      <path d="M452.9 199.9H454.9V201.9H452.9V199.9Z" fill="currentColor"/>
      <path d="M381.1 199.9H383.1V201.9H381.1V199.9Z" fill="currentColor"/>
      <path d="M468.8 199.9H470.8V201.9H468.8V199.9Z" fill="currentColor"/>
      <path d="M405 199.9H407V201.9H405V199.9Z" fill="currentColor"/>
      <path d="M512.6 212.4H514.6V214.4H512.6V212.4Z" fill="currentColor"/>
      <path d="M361.2 212.4H363.2V214.4H361.2V212.4Z" fill="currentColor"/>
      <path d="M353.2 212.4H355.2V214.4H353.2V212.4Z" fill="currentColor"/>
      <path d="M349.2 212.4H351.2V214.4H349.2V212.4Z" fill="currentColor"/>
      <path d="M504.7 212.4H506.7V214.4H504.7V212.4Z" fill="currentColor"/>
      <path d="M357.2 212.4H359.2V214.4H357.2V212.4Z" fill="currentColor"/>
      <path d="M508.7 212.4H510.7V214.4H508.7V212.4Z" fill="currentColor"/>
      <path d="M365.2 212.4H367.2V214.4H365.2V212.4Z" fill="currentColor"/>
      <path d="M341.3 212.4H343.3V214.4H341.3V212.4Z" fill="currentColor"/>
      <path d="M345.3 212.4H347.3V214.4H345.3V212.4Z" fill="currentColor"/>
      <path d="M500.7 212.4H502.7V214.4H500.7V212.4Z" fill="currentColor"/>
      <path d="M496.7 212.4H498.7V214.4H496.7V212.4Z" fill="currentColor"/>
      <path d="M516.6 212.4H518.6V214.4H516.6V212.4Z" fill="currentColor"/>
      <path d="M381.1 212.4H383.1V214.4H381.1V212.4Z" fill="currentColor"/>
      <path d="M432.9 212.4H434.9V214.4H432.9V212.4Z" fill="currentColor"/>
      <path d="M429 212.4H430.9V214.4H429V212.4Z" fill="currentColor"/>
      <path d="M425 212.4H427V214.4H425V212.4Z" fill="currentColor"/>
      <path d="M413 212.4H415V214.4H413V212.4Z" fill="currentColor"/>
      <path d="M421 212.4H423V214.4H421V212.4Z" fill="currentColor"/>
      <path d="M417 212.4H419V214.4H417V212.4Z" fill="currentColor"/>
      <path d="M436.9 212.4H438.9V214.4H436.9V212.4Z" fill="currentColor"/>
      <path d="M448.9 212.4H450.9V214.4H448.9V212.4Z" fill="currentColor"/>
      <path d="M452.9 212.4H454.9V214.4H452.9V212.4Z" fill="currentColor"/>
      <path d="M440.9 212.4H442.9V214.4H440.9V212.4Z" fill="currentColor"/>
      <path d="M444.9 212.4H446.9V214.4H444.9V212.4Z" fill="currentColor"/>
      <path d="M377.1 212.4H379.1V214.4H377.1V212.4Z" fill="currentColor"/>
      <path d="M385.1 212.4H387.1V214.4H385.1V212.4Z" fill="currentColor"/>
      <path d="M409 212.4H411V214.4H409V212.4Z" fill="currentColor"/>
      <path d="M369.2 212.4H371.2V214.4H369.2V212.4Z" fill="currentColor"/>
      <path d="M456.9 212.4H458.8V214.4H456.9V212.4Z" fill="currentColor"/>
      <path d="M373.2 212.4H375.2V214.4H373.2V212.4Z" fill="currentColor"/>
      <path d="M389.1 212.4H391.1V214.4H389.1V212.4Z" fill="currentColor"/>
      <path d="M401.1 212.4H403.1V214.4H401.1V212.4Z" fill="currentColor"/>
      <path d="M405 212.4H407V214.4H405V212.4Z" fill="currentColor"/>
      <path d="M397.1 212.4H399.1V214.4H397.1V212.4Z" fill="currentColor"/>
      <path d="M393.1 212.4H395.1V214.4H393.1V212.4Z" fill="currentColor"/>
      <path d="M468.8 212.4H470.8V214.4H468.8V212.4Z" fill="currentColor"/>
      <path d="M464.8 212.4H466.8V214.4H464.8V212.4Z" fill="currentColor"/>
      <path d="M484.8 212.4H486.7V214.4H484.8V212.4Z" fill="currentColor"/>
      <path d="M480.8 212.4H482.8V214.4H480.8V212.4Z" fill="currentColor"/>
      <path d="M488.7 212.4H490.7V214.4H488.7V212.4Z" fill="currentColor"/>
      <path d="M472.8 212.4H474.8V214.4H472.8V212.4Z" fill="currentColor"/>
      <path d="M476.8 212.4H478.8V214.4H476.8V212.4Z" fill="currentColor"/>
      <path d="M460.8 212.4H462.8V214.4H460.8V212.4Z" fill="currentColor"/>
      <path d="M492.7 212.4H494.7V214.4H492.7V212.4Z" fill="currentColor"/>
      <path d="M377.1 224.9H379.1V226.9H377.1V224.9Z" fill="currentColor"/>
      <path d="M401.1 224.9H403.1V226.9H401.1V224.9Z" fill="currentColor"/>
      <path d="M484.8 224.9H486.7V226.9H484.8V224.9Z" fill="currentColor"/>
      <path d="M397.1 224.9H399.1V226.9H397.1V224.9Z" fill="currentColor"/>
      <path d="M409 224.9H411V226.9H409V224.9Z" fill="currentColor"/>
      <path d="M480.8 224.9H482.8V226.9H480.8V224.9Z" fill="currentColor"/>
      <path d="M349.2 224.9H351.2V226.9H349.2V224.9Z" fill="currentColor"/>
      <path d="M405 224.9H407V226.9H405V224.9Z" fill="currentColor"/>
      <path d="M353.2 224.9H355.2V226.9H353.2V224.9Z" fill="currentColor"/>
      <path d="M373.2 224.9H375.2V226.9H373.2V224.9Z" fill="currentColor"/>
      <path d="M385.1 224.9H387.1V226.9H385.1V224.9Z" fill="currentColor"/>
      <path d="M369.2 224.9H371.2V226.9H369.2V224.9Z" fill="currentColor"/>
      <path d="M381.1 224.9H383.1V226.9H381.1V224.9Z" fill="currentColor"/>
      <path d="M341.3 224.9H343.3V226.9H341.3V224.9Z" fill="currentColor"/>
      <path d="M345.3 224.9H347.3V226.9H345.3V224.9Z" fill="currentColor"/>
      <path d="M488.7 224.9H490.7V226.9H488.7V224.9Z" fill="currentColor"/>
      <path d="M393.1 224.9H395.1V226.9H393.1V224.9Z" fill="currentColor"/>
      <path d="M492.7 224.9H494.7V226.9H492.7V224.9Z" fill="currentColor"/>
      <path d="M389.1 224.9H391.1V226.9H389.1V224.9Z" fill="currentColor"/>
      <path d="M500.7 224.9H502.7V226.9H500.7V224.9Z" fill="currentColor"/>
      <path d="M464.8 224.9H466.8V226.9H464.8V224.9Z" fill="currentColor"/>
      <path d="M468.8 224.9H470.8V226.9H468.8V224.9Z" fill="currentColor"/>
      <path d="M440.9 224.9H442.9V226.9H440.9V224.9Z" fill="currentColor"/>
      <path d="M444.9 224.9H446.9V226.9H444.9V224.9Z" fill="currentColor"/>
      <path d="M512.6 224.9H514.6V226.9H512.6V224.9Z" fill="currentColor"/>
      <path d="M436.9 224.9H438.9V226.9H436.9V224.9Z" fill="currentColor"/>
      <path d="M365.2 224.9H367.2V226.9H365.2V224.9Z" fill="currentColor"/>
      <path d="M452.9 224.9H454.9V226.9H452.9V224.9Z" fill="currentColor"/>
      <path d="M460.8 224.9H462.8V226.9H460.8V224.9Z" fill="currentColor"/>
      <path d="M456.9 224.9H458.8V226.9H456.9V224.9Z" fill="currentColor"/>
      <path d="M448.9 224.9H450.9V226.9H448.9V224.9Z" fill="currentColor"/>
      <path d="M516.6 224.9H518.6V226.9H516.6V224.9Z" fill="currentColor"/>
      <path d="M508.7 224.9H510.7V226.9H508.7V224.9Z" fill="currentColor"/>
      <path d="M425 224.9H427V226.9H425V224.9Z" fill="currentColor"/>
      <path d="M417 224.9H419V226.9H417V224.9Z" fill="currentColor"/>
      <path d="M476.8 224.9H478.8V226.9H476.8V224.9Z" fill="currentColor"/>
      <path d="M432.9 224.9H434.9V226.9H432.9V224.9Z" fill="currentColor"/>
      <path d="M357.2 224.9H359.2V226.9H357.2V224.9Z" fill="currentColor"/>
      <path d="M413 224.9H415V226.9H413V224.9Z" fill="currentColor"/>
      <path d="M421 224.9H423V226.9H421V224.9Z" fill="currentColor"/>
      <path d="M504.7 224.9H506.7V226.9H504.7V224.9Z" fill="currentColor"/>
      <path d="M496.7 224.9H498.7V226.9H496.7V224.9Z" fill="currentColor"/>
      <path d="M429 224.9H430.9V226.9H429V224.9Z" fill="currentColor"/>
      <path d="M361.2 224.9H363.2V226.9H361.2V224.9Z" fill="currentColor"/>
      <path d="M472.8 224.9H474.8V226.9H472.8V224.9Z" fill="currentColor"/>
      <path d="M341.2 263.3C342.6 263 344 262.3 345 261.1C346.1 260 346.7 258.6 346.9 257.1C347 255.6 346.7 254 346 252.7C345.2 251.4 344 250.4 342.6 249.7C341.3 249.1 339.7 249 338.2 249.3C336.7 249.6 335.4 250.4 334.4 251.5C333.4 252.7 332.7 254.1 332.6 255.6C332.5 257.1 332.8 258.7 333.6 260C334.3 261.2 335.5 262.2 336.8 262.8C338.2 263.4 339.7 263.6 341.2 263.3Z" fill="currentColor"/>
      <path d="M338.8 316.1H340.7V318.1H338.8V316.1Z" fill="currentColor"/>
      <path d="M338.8 312.1H340.7V314.1H338.8V312.1Z" fill="currentColor"/>
      <path d="M338.8 308.1H340.7V310.1H338.8V308.1Z" fill="currentColor"/>
      <path d="M338.8 304.1H340.7V306.1H338.8V304.1Z" fill="currentColor"/>
      <path d="M338.8 300.1H340.7V302.1H338.8V300.1Z" fill="currentColor"/>
      <path d="M338.8 320.1H340.7V322.1H338.8V320.1Z" fill="currentColor"/>
      <path d="M338.8 336H340.7V338H338.8V336Z" fill="currentColor"/>
      <path d="M338.8 296.1H340.7V298.1H338.8V296.1Z" fill="currentColor"/>
      <path d="M338.8 340H340.7V342H338.8V340Z" fill="currentColor"/>
      <path d="M338.8 324H340.7V326H338.8V324Z" fill="currentColor"/>
      <path d="M338.8 332H340.7V334H338.8V332Z" fill="currentColor"/>
      <path d="M338.8 272.2H340.7V274.2H338.8V272.2Z" fill="currentColor"/>
      <path d="M338.8 268.2H340.7V270.2H338.8V268.2Z" fill="currentColor"/>
      <path d="M338.8 264.3H340.7V266.3H338.8V264.3Z" fill="currentColor"/>
      <path d="M338.8 419.7H340.7V421.7H338.8V419.7Z" fill="currentColor"/>
      <path d="M338.8 292.2H340.7V294.2H338.8V292.2Z" fill="currentColor"/>
      <path d="M338.8 344H340.7V346H338.8V344Z" fill="currentColor"/>
      <path d="M338.8 284.2H340.7V286.2H338.8V284.2Z" fill="currentColor"/>
      <path d="M338.8 276.2H340.7V278.2H338.8V276.2Z" fill="currentColor"/>
      <path d="M338.8 288.2H340.7V290.2H338.8V288.2Z" fill="currentColor"/>
      <path d="M338.8 280.2H340.7V282.2H338.8V280.2Z" fill="currentColor"/>
      <path d="M338.8 328H340.7V330H338.8V328Z" fill="currentColor"/>
      <path d="M338.8 403.8H340.7V405.7H338.8V403.8Z" fill="currentColor"/>
      <path d="M338.8 399.8H340.7V401.8H338.8V399.8Z" fill="currentColor"/>
      <path d="M338.8 395.8H340.7V397.8H338.8V395.8Z" fill="currentColor"/>
      <path d="M338.8 387.8H340.7V389.8H338.8V387.8Z" fill="currentColor"/>
      <path d="M338.8 383.8H340.7V385.8H338.8V383.8Z" fill="currentColor"/>
      <path d="M338.8 391.8H340.7V393.8H338.8V391.8Z" fill="currentColor"/>
      <path d="M338.8 423.7H340.7V425H338.8V423.7Z" fill="currentColor"/>
      <path d="M338.8 415.7H340.7V417.7H338.8V415.7Z" fill="currentColor"/>
      <path d="M338.8 407.7H340.7V409.7H338.8V407.7Z" fill="currentColor"/>
      <path d="M338.8 411.7H340.7V413.7H338.8V411.7Z" fill="currentColor"/>
      <path d="M338.8 348H340.7V349.9H338.8V348Z" fill="currentColor"/>
      <path d="M338.8 355.9H340.7V357.9H338.8V355.9Z" fill="currentColor"/>
      <path d="M338.8 363.9H340.7V365.9H338.8V363.9Z" fill="currentColor"/>
      <path d="M338.8 359.9H340.7V361.9H338.8V359.9Z" fill="currentColor"/>
      <path d="M338.8 379.8H340.7V381.8H338.8V379.8Z" fill="currentColor"/>
      <path d="M338.8 351.9H340.7V353.9H338.8V351.9Z" fill="currentColor"/>
      <path d="M338.8 371.9H340.7V373.9H338.8V371.9Z" fill="currentColor"/>
      <path d="M338.8 367.9H340.7V369.9H338.8V367.9Z" fill="currentColor"/>
      <path d="M338.8 375.9H340.7V377.8H338.8V375.9Z" fill="currentColor"/>
      <path d="M450.6 349.3L449.5 347.7C448.9 348 448.4 348.4 447.9 348.8L449 350.4C449.6 350 450.1 349.7 450.6 349.3Z" fill="currentColor"/>
      <path d="M453.9 347.1L452.8 345.4C452.2 345.8 451.7 346.1 451.1 346.5L452.3 348.2C452.8 347.8 453.3 347.4 453.9 347.1Z" fill="currentColor"/>
      <path d="M441.4 356.7L440.1 355.2C439.5 355.6 439.1 356.1 438.6 356.5L439.9 358C440.4 357.5 440.9 357.1 441.4 356.7Z" fill="currentColor"/>
      <path d="M444.4 354.1L443.1 352.6C442.6 353 442.1 353.4 441.6 353.8L442.9 355.4C443.4 354.9 443.9 354.5 444.4 354.1Z" fill="currentColor"/>
      <path d="M438.5 359.3L437.1 357.9C436.6 358.4 436.1 358.8 435.7 359.3L437.1 360.7C437.5 360.3 438 359.8 438.5 359.3Z" fill="currentColor"/>
      <path d="M447.5 351.6L446.2 350C445.7 350.5 445.2 350.9 444.7 351.3L445.9 352.8C446.4 352.4 446.9 352 447.5 351.6Z" fill="currentColor"/>
      <path d="M457.2 344.9L456.2 343.2C455.6 343.6 455.1 343.9 454.5 344.3L455.6 346C456.1 345.6 456.7 345.3 457.2 344.9Z" fill="currentColor"/>
      <path d="M459.6 343.6L458.6 341.8L457.9 342.2L458.9 343.9L459.6 343.6Z" fill="currentColor"/>
      <path d="M440.9 373.3L442.6 374.3C442.9 373.8 443.3 373.2 443.6 372.7L442 371.6C441.6 372.1 441.2 372.7 440.9 373.3Z" fill="currentColor"/>
      <path d="M454.7 358.6L455.9 360.2C456.4 359.8 456.9 359.5 457.5 359.1L456.4 357.5C455.8 357.8 455.3 358.2 454.7 358.6Z" fill="currentColor"/>
      <path d="M451.5 361.1L452.8 362.6C453.3 362.2 453.8 361.8 454.3 361.4L453.1 359.8C452.5 360.2 452 360.6 451.5 361.1Z" fill="currentColor"/>
      <path d="M444.8 371.1C445.1 370.6 445.5 370.1 445.9 369.6L444.4 368.3C444 368.8 443.6 369.4 443.2 369.9L444.8 371.1Z" fill="currentColor"/>
      <path d="M445.7 366.7L447.2 368.1C447.6 367.6 448.1 367.1 448.5 366.6L447.1 365.2C446.6 365.7 446.1 366.2 445.7 366.7Z" fill="currentColor"/>
      <path d="M448.5 363.8L449.9 365.2C450.3 364.8 450.8 364.3 451.3 363.9L450 362.4C449.5 362.8 449 363.3 448.5 363.8Z" fill="currentColor"/>
      <path d="M459.2 358.1C459.7 357.8 460.3 357.5 460.9 357.2L459.9 355.4C459.3 355.7 458.7 356 458.1 356.4L459.2 358.1Z" fill="currentColor"/>
      <path d="M881.3 664.2C881.9 664.5 882.5 664.8 883.1 665.1L883.9 663.3C883.4 663 882.8 662.7 882.2 662.4L881.3 664.2Z" fill="currentColor"/>
      <path d="M919 683.2L917 683.7C917.2 684.3 917.3 684.9 917.4 685.6L919.4 685.2C919.3 684.5 919.1 683.8 919 683.2Z" fill="currentColor"/>
      <path d="M877.8 662.2C878.3 662.5 878.9 662.9 879.5 663.2L880.5 661.5C879.9 661.2 879.3 660.8 878.8 660.5L877.8 662.2Z" fill="currentColor"/>
      <path d="M917.8 687.5L919.8 687.2L920.1 689.1L918.2 689.5L917.8 687.5Z" fill="currentColor"/>
      <path d="M904.3 670.5L903.9 672.4L904.7 672.6C905.1 672.6 905.5 672.7 905.9 672.8L906.3 670.9C905.9 670.8 905.5 670.7 905.1 670.6L904.3 670.5Z" fill="currentColor"/>
      <path d="M884.9 666C885.5 666.3 886.1 666.6 886.7 666.8L887.5 665C886.9 664.7 886.3 664.5 885.7 664.2L884.9 666Z" fill="currentColor"/>
      <path d="M907.8 673.2C908.4 673.4 909 673.6 909.6 673.8L910.3 671.9C909.7 671.7 909 671.5 908.3 671.3L907.8 673.2Z" fill="currentColor"/>
      <path d="M915.6 675.6L914 676.9C914.4 677.3 914.7 677.8 915 678.4L916.8 677.4C916.4 676.7 916 676.2 915.6 675.6Z" fill="currentColor"/>
      <path d="M864.8 652.7C865.3 653.1 865.8 653.6 866.3 654L867.6 652.5C867.1 652.1 866.6 651.6 866.1 651.2L864.8 652.7Z" fill="currentColor"/>
      <path d="M872.2 656.1L871 657.7C871.6 658.1 872.1 658.5 872.7 658.9L873.8 657.3C873.3 656.9 872.7 656.5 872.2 656.1Z" fill="currentColor"/>
      <path d="M867.8 655.3C868.4 655.7 868.9 656.1 869.4 656.5L870.6 655C870.1 654.6 869.6 654.2 869.1 653.7L867.8 655.3Z" fill="currentColor"/>
      <path d="M875 659C874.5 659.1 873.9 659.2 873.4 659.4L873.8 661.3C874.4 661.2 875 661 875.6 660.9C875.8 661 875.9 661.1 876 661.1L877.1 659.5C876.5 659.1 876 658.8 875.4 658.4L875 659Z" fill="currentColor"/>
      <path d="M861.8 649.9C862.3 650.4 862.8 650.9 863.3 651.3L864.6 649.9C864.2 649.4 863.7 649 863.2 648.5L861.8 649.9Z" fill="currentColor"/>
      <path d="M912.8 675.6L914 674C913.9 673.9 913.8 673.8 913.7 673.8C913.2 673.4 912.7 673.1 912.2 672.8L911.3 674.6C911.7 674.8 912.1 675 912.4 675.3C912.6 675.4 912.7 675.5 912.8 675.6Z" fill="currentColor"/>
      <path d="M892.3 669.1C892.9 669.3 893.6 669.6 894.2 669.8L894.8 667.9C894.2 667.7 893.6 667.5 893 667.2L892.3 669.1Z" fill="currentColor"/>
      <path d="M900 671.5C900.7 671.7 901.3 671.8 902 672L902.4 670C901.8 669.9 901.1 669.7 900.5 669.6L900 671.5Z" fill="currentColor"/>
      <path d="M896.1 670.4C896.8 670.6 897.4 670.8 898.1 671L898.6 669C898 668.9 897.3 668.7 896.7 668.5L896.1 670.4Z" fill="currentColor"/>
      <path d="M888.5 667.6C889.2 667.9 889.8 668.1 890.4 668.4L891.1 666.5C890.5 666.3 889.9 666.1 889.3 665.8L888.5 667.6Z" fill="currentColor"/>
      <path d="M915.9 680C916.1 680.6 916.3 681.2 916.5 681.8L918.4 681.2C918.2 680.5 918 679.9 917.7 679.3L915.9 680Z" fill="currentColor"/>
      <path d="M642.3 659L643.6 660.5C644.1 660 644.6 659.6 645.1 659.1L643.8 657.7C643.3 658.1 642.8 658.5 642.3 659Z" fill="currentColor"/>
      <path d="M650.5 650.5L652 651.7C652.5 651.2 652.9 650.7 653.3 650.1L651.6 648.9C651.3 649.5 650.9 650 650.5 650.5Z" fill="currentColor"/>
      <path d="M645.2 656.3L646.6 657.8C647.1 657.3 647.6 656.8 648.1 656.3L646.6 655C646.2 655.4 645.7 655.9 645.2 656.3Z" fill="currentColor"/>
      <path d="M648 653.5L649.4 654.9C649.9 654.4 650.3 653.8 650.8 653.3L649.2 652C648.8 652.5 648.4 653 648 653.5Z" fill="currentColor"/>
      <path d="M639.3 661.4L640.5 663C641 662.6 641.5 662.2 642.1 661.8L640.8 660.2C640.3 660.6 639.8 661 639.3 661.4Z" fill="currentColor"/>
      <path d="M618.7 673L619.5 674.8C620.1 674.5 620.7 674.2 621.3 674L620.5 672.2C619.9 672.4 619.3 672.7 618.7 673Z" fill="currentColor"/>
      <path d="M609.5 676.7C609 676.9 608.5 677.1 608 677.3L606.9 677.1L606.6 679.1L608.6 679.3L608.6 679.2C609.2 679 609.7 678.8 610.2 678.6L609.5 676.7Z" fill="currentColor"/>
      <path d="M629.3 667.8L630.3 669.5C630.9 669.2 631.5 668.9 632 668.5L631 666.8C630.5 667.1 629.9 667.4 629.3 667.8Z" fill="currentColor"/>
      <path d="M615 674.5L615.8 676.4C616.4 676.1 617 675.8 617.6 675.6L616.8 673.7C616.2 674 615.6 674.3 615 674.5Z" fill="currentColor"/>
      <path d="M622.3 671.3L623.1 673.1C623.7 672.9 624.3 672.6 624.9 672.3L624.1 670.5C623.5 670.8 622.9 671.1 622.3 671.3Z" fill="currentColor"/>
      <path d="M625.8 669.6L626.7 671.4C627.3 671.1 627.9 670.8 628.5 670.5L627.6 668.7C627 669 626.4 669.3 625.8 669.6Z" fill="currentColor"/>
      <path d="M600.5 681.9L602.2 683C602.5 682.5 602.8 682 603.3 681.7L602 680.2C601.4 680.7 600.9 681.3 600.5 681.9Z" fill="currentColor"/>
      <path d="M599 686L600.9 686.4C601.1 685.8 601.2 685.2 601.4 684.6L599.6 683.9C599.3 684.6 599.1 685.3 599 686Z" fill="currentColor"/>
      <path d="M603.8 678.9L604.7 680.7C605.3 680.5 605.9 680.2 606.5 680L605.8 678.1C605.1 678.4 604.5 678.6 603.8 678.9Z" fill="currentColor"/>
      <path d="M598.5 688.7C598.5 689.1 598.4 689.5 598.3 689.9L600.3 690.3C600.4 689.8 600.4 689.4 600.5 689L600.6 688.3L598.6 688L598.5 688.7Z" fill="currentColor"/>
      <path d="M632.7 665.8L633.8 667.5C634.3 667.1 634.9 666.8 635.5 666.4L634.4 664.8C633.9 665.1 633.3 665.5 632.7 665.8Z" fill="currentColor"/>
      <path d="M611.3 676L612.1 677.8C612.7 677.6 613.3 677.4 613.9 677.1L613.2 675.3C612.6 675.5 611.9 675.8 611.3 676Z" fill="currentColor"/>
      <path d="M612.3 659.8L613.2 661.6C613.7 661.3 614.3 661.1 614.8 660.9L614.3 659C613.6 659.2 612.9 659.5 612.3 659.8Z" fill="currentColor"/>
      <path d="M628.1 662.7C628.8 662.8 629.4 662.9 630.1 663L630.4 661C629.7 661 629 660.9 628.4 660.8L628.1 662.7Z" fill="currentColor"/>
      <path d="M638.2 661.4C637.6 661.4 636.9 661.4 636.2 661.4L636.2 663.4C636.3 663.4 636.4 663.4 636.5 663.4C636.3 663.5 636.2 663.6 636.1 663.7L637.2 665.3C637.7 665 638.3 664.6 638.8 664.2L638.2 663.3L638.2 661.4Z" fill="currentColor"/>
      <path d="M634.3 661.3C633.6 661.3 633 661.2 632.3 661.2L632.2 663.2C632.8 663.2 633.5 663.3 634.2 663.3L634.3 661.3Z" fill="currentColor"/>
      <path d="M608.1 667.1L608.1 667.2L610.1 667.5L610.1 667.4C610.2 666.7 610.3 666.1 610.4 665.6L608.4 665.2C608.3 665.9 608.2 666.6 608.1 667.1Z" fill="currentColor"/>
      <path d="M610.4 661.2C610 661.6 609.6 662.1 609.3 662.6C609.2 662.7 609.2 662.9 609.1 663.1L610.9 663.9C611 663.8 611 663.7 611.1 663.6C611.3 663.2 611.5 662.9 611.8 662.6L610.4 661.2Z" fill="currentColor"/>
      <path d="M620.7 659L620.3 661C620.9 661.1 621.4 661.2 622.2 661.4L622.7 659.5C621.9 659.3 621.3 659.1 620.7 659Z" fill="currentColor"/>
      <path d="M616.5 658.7L616.6 660.6C616.9 660.6 617.2 660.6 617.5 660.6C617.8 660.6 618.1 660.7 618.4 660.7L618.6 658.7C618.3 658.7 617.9 658.6 617.6 658.6C617.2 658.6 616.9 658.6 616.5 658.7Z" fill="currentColor"/>
      <path d="M607.6 671.2L607.9 669.2L609.9 669.5L609.6 671.4L607.6 671.2Z" fill="currentColor"/>
      <path d="M626.5 660.4L626.1 660.3C625.6 660.2 625.1 660.1 624.6 660L624.1 661.9C624.7 662 625.2 662.2 625.7 662.3L626.1 662.4L626.5 660.4Z" fill="currentColor"/>
      <path d="M607.1 675.1L607.4 673.2L609.4 673.4L609.1 675.4L607.1 675.1Z" fill="currentColor"/>
      <path d="M879.2 658.1C878.6 658.2 877.9 658.4 877.3 658.5L877.7 660.4C878.3 660.3 879 660.2 879.6 660L879.2 658.1Z" fill="currentColor"/>
      <path d="M905.6 669.8L907.5 669.4L907.6 669.6L905.6 669.9L905.6 669.8Z" fill="currentColor"/>
      <path d="M905.6 659C905.5 658.5 905.4 658 905.2 657.5L903.4 658.2C903.5 658.6 903.6 659 903.7 659.4L903.8 660L905.7 659.6L905.6 659Z" fill="currentColor"/>
      <path d="M901.1 655L901.1 657C901.6 656.9 902.1 657 902.6 657.3L903.5 655.5C902.8 655.1 902 655 901.1 655Z" fill="currentColor"/>
      <path d="M889.1 656.3L889.4 658.3C890 658.2 890.7 658.1 891.4 658L891.1 656.1C890.4 656.1 889.8 656.2 889.1 656.3Z" fill="currentColor"/>
      <path d="M887.1 656.6C886.5 656.8 885.8 656.9 885.1 657L885.5 658.9C886.1 658.8 886.8 658.7 887.4 658.6L887.1 656.6Z" fill="currentColor"/>
      <path d="M897 655.3L897.3 657.3C897.9 657.2 898.6 657.2 899.2 657.1L899 655.1C898.4 655.2 897.7 655.2 897 655.3Z" fill="currentColor"/>
      <path d="M904.9 665.9L906.8 665.5L907.2 667.5L905.2 667.8L904.9 665.9Z" fill="currentColor"/>
      <path d="M883.5 659.3L883.2 657.3C882.5 657.4 881.9 657.6 881.2 657.7L881.6 659.6C882.2 659.5 882.9 659.4 883.5 659.3Z" fill="currentColor"/>
      <path d="M904.1 661.9L906.1 661.6L906.4 663.5L904.5 663.9L904.1 661.9Z" fill="currentColor"/>
      <path d="M893.1 655.8L893.3 657.8C894 657.7 894.6 657.6 895.3 657.5L895.1 655.5C894.4 655.6 893.7 655.7 893.1 655.8Z" fill="currentColor"/>
      <path d="M687.7 650.6L687.8 648.6L689.8 648.7L689.7 650.7L687.7 650.6Z" fill="currentColor"/>
      <path d="M735.5 652.8L735.6 650.9L737.6 650.9L737.5 652.9L735.5 652.8Z" fill="currentColor"/>
      <path d="M893 635.1L893.6 637C894.3 636.8 894.9 636.6 895.5 636.3L894.9 634.5C894.3 634.7 893.6 634.9 893 635.1Z" fill="currentColor"/>
      <path d="M885.4 637.5L886 639.4C886.6 639.2 887.3 639 887.9 638.8L887.3 636.9C886.7 637.1 886.1 637.3 885.4 637.5Z" fill="currentColor"/>
      <path d="M889.2 636.3L889.8 638.2C890.5 638 891.1 637.8 891.7 637.6L891.1 635.7C890.5 635.9 889.9 636.1 889.2 636.3Z" fill="currentColor"/>
      <path d="M727.5 652.5L727.6 650.5L729.6 650.6L729.5 652.6L727.5 652.5Z" fill="currentColor"/>
      <path d="M707.6 651.6L707.7 649.6L709.7 649.7L709.6 651.7L707.6 651.6Z" fill="currentColor"/>
      <path d="M711.6 651.8L711.7 649.8L713.7 649.9L713.6 651.9L711.6 651.8Z" fill="currentColor"/>
      <path d="M715.6 652L715.7 650L717.7 650.1L717.6 652.1L715.6 652Z" fill="currentColor"/>
      <path d="M703.6 651.4L703.7 649.4L705.7 649.5L705.6 651.5L703.6 651.4Z" fill="currentColor"/>
      <path d="M896.8 633.8L897.4 635.7C898 635.5 898.7 635.3 899.3 635L898.6 633.2C898 633.4 897.4 633.6 896.8 633.8Z" fill="currentColor"/>
      <path d="M876.4 642L875.9 640.1C875.2 640.3 874.6 640.4 873.9 640.6L874.4 642.5C875.1 642.4 875.7 642.2 876.4 642Z" fill="currentColor"/>
      <path d="M695.7 651L695.8 649L697.8 649.1L697.7 651.1L695.7 651Z" fill="currentColor"/>
      <path d="M699.7 651.2L699.8 649.2L701.8 649.3L701.7 651.3L699.7 651.2Z" fill="currentColor"/>
      <path d="M719.6 652.2L719.7 650.2L721.6 650.3L721.6 652.3L719.6 652.2Z" fill="currentColor"/>
      <path d="M928.7 622.4L927.8 620.7C927.2 621 926.6 621.3 926 621.6L926.9 623.4C927.5 623.1 928.1 622.8 928.7 622.4Z" fill="currentColor"/>
      <path d="M723.6 652.4L723.6 650.4L725.6 650.5L725.5 652.4L723.6 652.4Z" fill="currentColor"/>
      <path d="M739.5 653L739.6 651L741.5 651.1L741.5 653L739.5 653Z" fill="currentColor"/>
      <path d="M731.5 652.7L731.6 650.7L733.6 650.8L733.5 652.8L731.5 652.7Z" fill="currentColor"/>
      <path d="M914.2 629.2L913.4 627.4C912.8 627.7 912.2 627.9 911.6 628.2L912.4 630C913 629.8 913.6 629.5 914.2 629.2Z" fill="currentColor"/>
      <path d="M908.7 631.5C909.3 631.3 909.9 631 910.5 630.8L909.8 628.9C909.2 629.2 908.5 629.4 907.9 629.7L908.7 631.5Z" fill="currentColor"/>
      <path d="M921.5 626L920.7 624.2C920.1 624.4 919.5 624.7 918.9 625L919.7 626.8C920.3 626.5 920.9 626.3 921.5 626Z" fill="currentColor"/>
      <path d="M917.9 627.6L917.1 625.8C916.5 626.1 915.9 626.4 915.3 626.6L916.1 628.4C916.7 628.2 917.3 627.9 917.9 627.6Z" fill="currentColor"/>
      <path d="M691.7 650.8L691.8 648.8L693.8 648.9L693.7 650.9L691.7 650.8Z" fill="currentColor"/>
      <path d="M795.3 651.1L795.3 653.1C796 653.1 796.7 653 797.3 653L797.3 651C796.6 651.1 795.9 651.1 795.3 651.1Z" fill="currentColor"/>
      <path d="M791.3 651.3L791.4 653.2C792 653.2 792.7 653.2 793.4 653.2L793.3 651.2C792.6 651.2 792 651.2 791.3 651.3Z" fill="currentColor"/>
      <path d="M787.3 651.4L787.4 653.4C788 653.3 788.7 653.3 789.4 653.3L789.3 651.3C788.6 651.3 788 651.3 787.3 651.4Z" fill="currentColor"/>
      <path d="M799.2 650.9L799.3 652.9C800 652.9 800.7 652.9 801.3 652.8L801.2 650.8C800.6 650.9 799.9 650.9 799.2 650.9Z" fill="currentColor"/>
      <path d="M775.4 651.5L775.4 653.5C776.1 653.5 776.7 653.5 777.4 653.5L777.4 651.5C776.7 651.5 776 651.5 775.4 651.5Z" fill="currentColor"/>
      <path d="M872.5 643L872 641.1C871.4 641.2 870.7 641.4 870.1 641.5L870.5 643.5C871.2 643.3 871.8 643.2 872.5 643Z" fill="currentColor"/>
      <path d="M783.3 651.5L783.4 653.4C784 653.4 784.7 653.4 785.4 653.4L785.3 651.4C784.7 651.4 784 651.4 783.3 651.5Z" fill="currentColor"/>
      <path d="M803.2 650.7L803.3 652.7C804 652.7 804.7 652.7 805.3 652.6L805.2 650.6C804.5 650.7 803.9 650.7 803.2 650.7Z" fill="currentColor"/>
      <path d="M779.4 651.5L779.4 653.5C780 653.5 780.7 653.5 781.4 653.5L781.4 651.5C780.7 651.5 780 651.5 779.4 651.5Z" fill="currentColor"/>
      <path d="M868.6 643.9L868.1 642C867.5 642.1 866.8 642.3 866.2 642.4L866.6 644.4C867.3 644.2 867.9 644.1 868.6 643.9Z" fill="currentColor"/>
      <path d="M807.2 650.5L807.3 652.5C808 652.5 808.6 652.4 809.3 652.4L809.2 650.4C808.5 650.4 807.8 650.5 807.2 650.5Z" fill="currentColor"/>
      <path d="M906.8 632.3L906.1 630.4C905.5 630.6 904.9 630.9 904.2 631.1L904.9 633C905.6 632.7 906.2 632.5 906.8 632.3Z" fill="currentColor"/>
      <path d="M823 649.2L823.2 651.2C823.9 651.2 824.6 651.1 825.2 651L825 649C824.4 649.1 823.7 649.2 823 649.2Z" fill="currentColor"/>
      <path d="M880.2 641L879.7 639.1C879.1 639.3 878.4 639.4 877.8 639.6L878.3 641.5C878.9 641.4 879.6 641.2 880.2 641Z" fill="currentColor"/>
      <path d="M903.1 633.7L902.4 631.8C901.8 632 901.1 632.3 900.5 632.5L901.2 634.4C901.8 634.1 902.4 633.9 903.1 633.7Z" fill="currentColor"/>
      <path d="M819.1 649.6L819.3 651.6L821.2 651.4L821.1 649.4L819.1 649.6Z" fill="currentColor"/>
      <path d="M811.2 650.2L811.3 652.2C812 652.2 812.6 652.1 813.3 652.1L813.1 650.1C812.5 650.1 811.8 650.2 811.2 650.2Z" fill="currentColor"/>
      <path d="M815.1 649.9L815.3 651.9C815.9 651.9 816.6 651.8 817.3 651.8L817.1 649.8C816.4 649.8 815.8 649.9 815.1 649.9Z" fill="currentColor"/>
      <path d="M759.4 653.5C760.1 653.5 760.8 653.5 761.4 653.5L761.5 651.5C760.8 651.5 760.1 651.5 759.5 651.5L759.4 653.5Z" fill="currentColor"/>
      <path d="M767.4 653.5L769.4 653.6L769.4 651.6L767.4 651.6L767.4 653.5Z" fill="currentColor"/>
      <path d="M771.4 651.6L771.4 653.6C772.1 653.6 772.7 653.6 773.4 653.6L773.4 651.6C772.7 651.6 772.1 651.6 771.4 651.6Z" fill="currentColor"/>
      <path d="M763.4 653.5L765.4 653.5L765.4 651.5L763.4 651.5L763.4 653.5Z" fill="currentColor"/>
      <path d="M881.6 638.5L882.1 640.5C882.8 640.3 883.4 640.1 884.1 639.9L883.5 638C882.9 638.2 882.2 638.4 881.6 638.5Z" fill="currentColor"/>
      <path d="M862.3 643.3L862.7 645.2C863.4 645.1 864 644.9 864.7 644.8L864.3 642.9C863.6 643 863 643.1 862.3 643.3Z" fill="currentColor"/>
      <path d="M747.5 653.2L747.5 651.2L749.5 651.3L749.5 653.3L747.5 653.2Z" fill="currentColor"/>
      <path d="M743.5 653.1L743.5 651.1L745.5 651.2L745.5 653.2L743.5 653.1Z" fill="currentColor"/>
      <path d="M751.5 653.3L751.5 651.3L753.5 651.4L753.4 653.4L751.5 653.3Z" fill="currentColor"/>
      <path d="M755.4 653.4L757.4 653.4L757.5 651.4L755.5 651.4L755.4 653.4Z" fill="currentColor"/>
      <path d="M827 648.8L827.2 650.8C827.9 650.7 828.5 650.7 829.2 650.6L829 648.6C828.3 648.7 827.7 648.8 827 648.8Z" fill="currentColor"/>
      <path d="M834.9 647.9L835.1 649.9C835.8 649.8 836.5 649.7 837.1 649.6L836.9 647.6C836.2 647.7 835.5 647.8 834.9 647.9Z" fill="currentColor"/>
      <path d="M838.8 647.4L839.1 649.3C839.8 649.2 840.4 649.2 841.1 649.1L840.8 647.1C840.1 647.2 839.5 647.3 838.8 647.4Z" fill="currentColor"/>
      <path d="M842.8 646.8L843.1 648.8C843.7 648.7 844.4 648.6 845 648.5L844.7 646.5C844.1 646.6 843.4 646.7 842.8 646.8Z" fill="currentColor"/>
      <path d="M858.4 644.1L858.8 646C859.5 645.9 860.1 645.8 860.8 645.6L860.4 643.7C859.7 643.8 859.1 643.9 858.4 644.1Z" fill="currentColor"/>
      <path d="M830.9 648.4L831.2 650.4C831.8 650.3 832.5 650.2 833.2 650.1L832.9 648.1C832.3 648.2 831.6 648.3 830.9 648.4Z" fill="currentColor"/>
      <path d="M854.5 644.8L854.9 646.8C855.5 646.7 856.2 646.5 856.8 646.4L856.5 644.5C855.8 644.6 855.2 644.7 854.5 644.8Z" fill="currentColor"/>
      <path d="M846.7 646.2L847 648.1C847.7 648 848.3 647.9 849 647.8L848.6 645.9C848 646 847.3 646.1 846.7 646.2Z" fill="currentColor"/>
      <path d="M850.6 645.5L850.9 647.5C851.6 647.4 852.3 647.3 852.9 647.1L852.6 645.2C851.9 645.3 851.3 645.4 850.6 645.5Z" fill="currentColor"/>
      <path d="M925.1 624.2L924.3 622.5C923.7 622.7 923.1 623 922.5 623.3L923.3 625.1C923.9 624.8 924.5 624.5 925.1 624.2Z" fill="currentColor"/>
      <path d="M618.5 642.1C617.9 642 617.2 641.9 616.5 641.8L616.2 643.7C616.9 643.8 617.6 643.9 618.2 644L618.5 642.1Z" fill="currentColor"/>
      <path d="M614.6 641.5C613.9 641.3 613.3 641.2 612.6 641.1L612.3 643.1C613 643.2 613.6 643.3 614.3 643.4L614.6 641.5Z" fill="currentColor"/>
      <path d="M610.7 640.8C610 640.7 609.4 640.6 608.7 640.5L608.4 642.4C609 642.5 609.7 642.7 610.3 642.8L610.7 640.8Z" fill="currentColor"/>
      <path d="M602.8 639.4C602.2 639.3 601.5 639.2 600.9 639L600.5 641C601.2 641.1 601.8 641.2 602.5 641.4L602.8 639.4Z" fill="currentColor"/>
      <path d="M606.7 640.1C606.1 640 605.4 639.9 604.8 639.8L604.4 641.7C605.1 641.8 605.7 642 606.4 642.1L606.7 640.1Z" fill="currentColor"/>
      <path d="M650.1 645.9C649.4 645.8 648.8 645.8 648.1 645.7L647.9 647.7C648.6 647.7 649.3 647.8 649.9 647.9L650.1 645.9Z" fill="currentColor"/>
      <path d="M622.4 642.6C621.8 642.5 621.1 642.5 620.5 642.4L620.2 644.3C620.9 644.4 621.5 644.5 622.2 644.6L622.4 642.6Z" fill="currentColor"/>
      <path d="M646.1 645.5C645.5 645.4 644.8 645.4 644.2 645.3L644 647.3C644.6 647.3 645.3 647.4 645.9 647.5L646.1 645.5Z" fill="currentColor"/>
      <path d="M634.3 644.2C633.6 644.1 633 644 632.3 644L632.1 645.9C632.7 646 633.4 646.1 634 646.2L634.3 644.2Z" fill="currentColor"/>
      <path d="M630.3 643.7C629.7 643.6 629 643.5 628.4 643.5L628.1 645.4C628.8 645.5 629.4 645.6 630.1 645.7L630.3 643.7Z" fill="currentColor"/>
      <path d="M626.4 643.2C625.7 643.1 625.1 643 624.4 642.9L624.1 644.9C624.8 645 625.5 645.1 626.1 645.2L626.4 643.2Z" fill="currentColor"/>
      <path d="M640 646.9C640.7 646.9 641.3 647 642 647.1L642.2 645.1C641.5 645 640.9 644.9 640.2 644.9L640 646.9Z" fill="currentColor"/>
      <path d="M671.8 649.6L671.9 647.6L673.9 647.8L673.8 649.8L671.8 649.6Z" fill="currentColor"/>
      <path d="M667.8 649.4L668 647.4L670 647.5L669.8 649.5L667.8 649.4Z" fill="currentColor"/>
      <path d="M663.8 649L665.8 649.2L666 647.2L664 647.1L663.8 649Z" fill="currentColor"/>
      <path d="M679.8 650.1L679.9 648.1L681.9 648.3L681.7 650.3L679.8 650.1Z" fill="currentColor"/>
      <path d="M675.8 649.9L675.9 647.9L677.9 648L677.8 650L675.8 649.9Z" fill="currentColor"/>
      <path d="M651.9 648C652.6 648.1 653.2 648.2 653.9 648.2L654.1 646.2C653.4 646.2 652.7 646.1 652.1 646.1L651.9 648Z" fill="currentColor"/>
      <path d="M683.7 650.4L683.8 648.4L685.8 648.5L685.7 650.5L683.7 650.4Z" fill="currentColor"/>
      <path d="M638.2 644.7C637.6 644.6 636.9 644.5 636.3 644.4L636 646.4C636.7 646.5 637.3 646.6 638 646.6L638.2 644.7Z" fill="currentColor"/>
      <path d="M659.9 648.7L660 646.7L662 646.9L661.8 648.9L659.9 648.7Z" fill="currentColor"/>
      <path d="M655.9 648.4C656.5 648.5 657.2 648.5 657.9 648.6L658 646.6C657.4 646.5 656.7 646.5 656 646.4L655.9 648.4Z" fill="currentColor"/>
      <path d="M838.5 125.6L838.8 123.6C838.2 123.5 837.7 123.3 837.2 123.1L836.3 124.8C837 125.2 837.7 125.4 838.5 125.6Z" fill="currentColor"/>
      <path d="M843 124.6L842 122.9C841.5 123.2 840.9 123.4 840.4 123.5L840.8 125.4C841.6 125.3 842.3 125 843 124.6Z" fill="currentColor"/>
      <path d="M835.1 117.1C835.1 117.3 835.1 117.4 835.1 117.6C835.1 117.9 835.1 118.2 835 118.5L837 118.8C837.1 118.4 837.1 118 837.1 117.6C837.1 117.4 837.1 117.2 837.1 117C837.1 116.8 837.1 116.6 837 116.5L835.1 116.8C835.1 116.9 835.1 117 835.1 117.1Z" fill="currentColor"/>
      <path d="M826.4 123C827 123.5 827.6 124 828.4 124.3L829.1 122.4C828.6 122.2 828.2 121.9 827.8 121.5L826.4 123Z" fill="currentColor"/>
      <path d="M826.6 119.1C826.6 119 826.6 118.9 826.6 118.8L824.6 118.6C824.6 118.8 824.6 118.9 824.6 119.1C824.6 119.7 824.7 120.4 825 121L826.8 120.3C826.7 119.9 826.6 119.5 826.6 119.1Z" fill="currentColor"/>
      <path d="M832.1 119.7L834 119.1C833.9 118.7 833.8 118.4 833.8 118C833.7 117.9 833.7 117.7 833.7 117.6C833.7 117.6 833.7 117.5 833.7 117.5L831.7 117.4C831.7 117.5 831.7 117.5 831.7 117.6C831.7 117.9 831.7 118.1 831.8 118.3C831.9 118.8 832 119.3 832.1 119.7Z" fill="currentColor"/>
      <path d="M834.4 115.9C834.5 115.9 834.5 115.9 834.5 115.9C834.5 115.9 834.6 115.9 834.6 115.9L835.5 114.1C835 113.9 834.4 113.8 833.8 114C833.3 114.1 832.8 114.5 832.5 115L834.1 116.1C834.2 116 834.3 115.9 834.4 115.9Z" fill="currentColor"/>
      <path d="M868.7 116.4L867.9 114.5C867.3 114.8 866.7 115 866.1 115.2L866.8 117.1C867.4 116.9 868 116.6 868.7 116.4Z" fill="currentColor"/>
      <path d="M853.8 118.4L853.8 118.4L853.9 119C854.2 118.9 854.4 118.9 854.7 119L854.7 118.8L854.8 118.8L855.1 120.2C855.7 120.1 856.4 120 857 119.8L856.6 117.9C856.4 117.9 856.2 118 855.9 118L856 117.3L855.1 117C854.6 116.9 854 116.9 853.5 117L853.8 118.3C853.8 118.3 853.8 118.3 853.8 118.4Z" fill="currentColor"/>
      <path d="M861 118.9L860.5 117C859.8 117.2 859.2 117.3 858.6 117.5L859 119.4C859.7 119.2 860.3 119.1 861 118.9Z" fill="currentColor"/>
      <path d="M851.9 122.1C852.7 121.9 853.4 121.6 854.1 121.1L852.9 119.6L852.8 118.6C852.4 118.6 852 118.7 851.7 118.7L851.3 118.4C851.1 118.7 850.9 119.1 850.8 119.4L850.3 120.9L851.6 120.7L851.9 122.1Z" fill="currentColor"/>
      <path d="M833 124.2L832.2 122.4C831.9 122.5 831.6 122.6 831.3 122.7C831.1 122.7 830.9 122.7 830.7 122.7L830.7 124.7C831 124.7 831.3 124.7 831.6 124.6C832.1 124.5 832.6 124.4 833 124.2Z" fill="currentColor"/>
      <path d="M864.9 117.7L864.2 115.9C863.6 116.1 863 116.3 862.4 116.4L862.9 118.4C863.6 118.2 864.2 118 864.9 117.7Z" fill="currentColor"/>
      <path d="M846.1 119.2L847.4 120C847.8 119.3 848.1 118.7 848.3 118L847.3 117.6C847.2 117.4 847.2 117.2 847.2 117L845.2 117.1C845.2 117.9 845.4 118.6 845.8 119.4L846.1 119.2Z" fill="currentColor"/>
      <path d="M846.9 115.6L848.9 115.9C849 115.2 849.1 114.5 849.1 113.8L848 113.8L846.7 112.7C846.2 113.3 845.8 114 845.5 114.7L847 115.2C847 115.3 847 115.4 846.9 115.6Z" fill="currentColor"/>
      <path d="M847.3 121.3C847.9 121.8 848.7 122.1 849.5 122.3L849.9 120.3C849.4 120.2 848.9 120 848.5 119.7L847.3 121.3Z" fill="currentColor"/>
      <path d="M846.2 121.7L844.7 120.5C844.3 121 843.9 121.4 843.4 121.8L844.7 123.3C845.3 122.8 845.8 122.3 846.2 121.7Z" fill="currentColor"/>
      <path d="M872.4 114.8L871.5 113C870.9 113.2 870.3 113.5 869.7 113.8L870.5 115.6C871.1 115.3 871.8 115 872.4 114.8Z" fill="currentColor"/>
      <path d="M834.5 123.5L835.9 122C835.8 122 835.8 121.9 835.7 121.9C835.9 121.6 836.1 121.3 836.3 121L834.5 120.1C834.2 120.6 833.9 121 833.5 121.4L833.5 121.4L833.1 121.7C833.5 122.4 833.9 122.9 834.5 123.5Z" fill="currentColor"/>
      <path d="M874.5 113.7L873.6 112L873.3 112.1L874.2 113.9L874.5 113.7Z" fill="currentColor"/>
      <path d="M837.3 142C837.9 142 838.6 141.9 839.3 141.8L839 139.8C838.3 139.9 837.7 140 837 140.1L837.3 142Z" fill="currentColor"/>
      <path d="M856.9 138C857.6 137.8 858.2 137.6 858.9 137.4L858.3 135.5C857.6 135.7 857 135.9 856.4 136.1L856.9 138Z" fill="currentColor"/>
      <path d="M855 138.6L854.5 136.6C853.8 136.8 853.2 137 852.6 137.2L853.1 139.1C853.7 138.9 854.4 138.7 855 138.6Z" fill="currentColor"/>
      <path d="M841 139.5L841.3 141.5C841.9 141.4 842.6 141.3 843.2 141.2L842.9 139.2C842.3 139.3 841.6 139.4 841 139.5Z" fill="currentColor"/>
      <path d="M835.3 142.2L835.1 140.3C834.4 140.3 833.8 140.4 833.1 140.4L833.3 142.4C833.9 142.4 834.6 142.3 835.3 142.2Z" fill="currentColor"/>
      <path d="M851.1 139.6L850.6 137.6C850 137.8 849.4 137.9 848.7 138.1L849.2 140C849.8 139.9 850.5 139.7 851.1 139.6Z" fill="currentColor"/>
      <path d="M867.6 132.3L867.5 132.3C867.5 132.3 867.5 132.4 867.4 132.5L867.7 132.6L868.3 134C868.9 133.7 869.5 133.5 870.1 133.2L869.4 131.4C868.8 131.6 868.1 131.9 867.5 132.1L867.6 132.3Z" fill="currentColor"/>
      <path d="M864.6 135.5C865.2 135.2 865.8 135 866.4 134.7L865.7 132.9C865.1 133.1 864.5 133.4 863.9 133.6L864.6 135.5Z" fill="currentColor"/>
      <path d="M847.2 140.4L846.8 138.5C846.1 138.6 845.5 138.8 844.8 138.9L845.2 140.8C845.9 140.7 846.5 140.6 847.2 140.4Z" fill="currentColor"/>
      <path d="M860.8 136.8C861.4 136.6 862 136.4 862.7 136.1L862 134.3C861.4 134.5 860.8 134.7 860.1 134.9L860.8 136.8Z" fill="currentColor"/>
      <path d="M858.1 156.6L858.7 158.5C859.4 158.2 860 158 860.6 157.8L860 155.9C859.3 156.1 858.7 156.4 858.1 156.6Z" fill="currentColor"/>
      <path d="M840.9 160.7C840.2 160.8 839.6 160.9 838.9 161L839.2 163C839.8 162.9 840.5 162.8 841.1 162.7L840.9 160.7Z" fill="currentColor"/>
      <path d="M861.8 155.2L862.5 157.1C863.1 156.8 863.8 156.6 864.4 156.3L863.6 154.5C863 154.7 862.4 155 861.8 155.2Z" fill="currentColor"/>
      <path d="M844.8 160.1C844.1 160.2 843.5 160.3 842.8 160.4L843.1 162.4C843.8 162.3 844.5 162.2 845.1 162L844.8 160.1Z" fill="currentColor"/>
      <path d="M848.6 159.3C848 159.4 847.3 159.6 846.7 159.7L847.1 161.6C847.7 161.5 848.4 161.4 849.1 161.2L848.6 159.3Z" fill="currentColor"/>
      <path d="M856.2 157.2C855.6 157.4 855 157.6 854.3 157.8L854.9 159.7C855.5 159.5 856.2 159.3 856.8 159.1L856.2 157.2Z" fill="currentColor"/>
      <path d="M836.9 161.2C836.3 161.3 835.6 161.3 835 161.4L835.2 163.4C835.8 163.3 836.5 163.3 837.2 163.2L836.9 161.2Z" fill="currentColor"/>
      <path d="M833 161.6C832.4 161.6 831.7 161.6 831 161.7L831.1 163.7C831.8 163.6 832.5 163.6 833.1 163.5L833 161.6Z" fill="currentColor"/>
      <path d="M853 160.2L852.4 158.3C851.8 158.5 851.2 158.6 850.5 158.8L851 160.7C851.7 160.6 852.3 160.4 853 160.2Z" fill="currentColor"/>
      <path d="M842.8 181.7C842.1 181.9 841.5 182 840.9 182.1L841.3 184.1C841.9 184 842.5 183.8 843.3 183.7L842.8 181.7Z" fill="currentColor"/>
      <path d="M835.2 182.6C834.6 182.5 834 182.4 833.4 182.3L833 184.3C833.7 184.4 834.4 184.5 835.1 184.5L835.2 182.6Z" fill="currentColor"/>
      <path d="M851 181.9L850.7 180C850 180.1 849.4 180.2 848.7 180.4L849.1 182.3C849.8 182.2 850.4 182 851 181.9Z" fill="currentColor"/>
      <path d="M860.6 178.8C861 178.6 861.5 178.4 862 178.4L862.1 176.4C861.2 176.4 860.4 176.6 859.6 177.1L860.6 178.8Z" fill="currentColor"/>
      <path d="M839.3 184.4L839 182.4C838.4 182.5 837.7 182.5 837.1 182.6L837.2 184.6C837.8 184.5 838.5 184.5 839.3 184.4Z" fill="currentColor"/>
      <path d="M854.9 181.4L854.6 179.4C854.3 179.5 853.9 179.5 853.5 179.6C853.2 179.6 853 179.6 852.7 179.7L852.9 181.7C853.2 181.6 853.4 181.6 853.7 181.6C854.1 181.5 854.5 181.5 854.9 181.4Z" fill="currentColor"/>
      <path d="M846.7 180.8L844.8 181.3L845.2 183.2L847.2 182.8L846.7 180.8Z" fill="currentColor"/>
      <path d="M859 179.9L857.9 178.3C857.6 178.5 857.4 178.6 857.2 178.7C856.9 178.9 856.7 179 856.4 179.1L857 180.9C857.4 180.8 857.8 180.7 858.1 180.5C858.4 180.3 858.7 180.1 859 179.9Z" fill="currentColor"/>
      <path d="M849.7 207.1L849.3 205.2C848.7 205.3 848 205.4 847.4 205.5L847.7 207.5C848.4 207.4 849 207.3 849.7 207.1Z" fill="currentColor"/>
      <path d="M839.7 208.4C840.4 208.4 841 208.4 841.7 208.3L841.5 206.3C840.9 206.4 840.2 206.4 839.6 206.5L839.7 208.4Z" fill="currentColor"/>
      <path d="M851.7 206.7C852.3 206.6 853 206.4 853.6 206.3L853.1 204.3C852.5 204.5 851.9 204.6 851.2 204.8L851.7 206.7Z" fill="currentColor"/>
      <path d="M831.5 207.2L831.5 207.4L831.5 207.5C831.6 207.8 831.9 208.1 832.2 208.3C832.5 208.5 832.8 208.6 833.2 208.6L833.6 208.6L833.6 207.4L833.8 207.5C833.9 207.4 833.9 207.2 833.9 207.1C833.9 206.9 833.9 206.8 833.8 206.6C833.8 206.5 833.7 206.4 833.6 206.3C833.5 206.2 833.3 206.1 833.2 206C833.1 206 832.9 206 832.8 206C832.4 206 832.1 206.1 831.9 206.3C831.6 206.5 831.5 206.8 831.5 207.2ZM833 207.2L833.5 207.4C833.4 207.5 833.3 207.7 833.2 207.8C833.1 207.9 832.9 208 832.8 208C832.5 208 832.3 207.9 832.2 207.7C832 207.5 831.9 207.3 831.9 207.1C831.9 207 831.9 206.8 832 206.7L832.8 207.1L832.5 207.2H833Z" fill="currentColor"/>
      <path d="M860.6 202C860 202.2 859.4 202.4 858.8 202.6L859.4 204.5C860.1 204.3 860.7 204.1 861.3 203.9L860.6 202Z" fill="currentColor"/>
      <path d="M843.7 208.1C844.4 208 845 207.9 845.7 207.8L845.4 205.9C844.8 205.9 844.1 206 843.5 206.1L843.7 208.1Z" fill="currentColor"/>
      <path d="M835.6 206.6L835.6 208.6C836.3 208.6 837 208.6 837.7 208.5L837.6 206.6C836.9 206.6 836.3 206.6 835.6 206.6Z" fill="currentColor"/>
      <path d="M855 203.8L855.6 205.7C856.2 205.6 856.9 205.4 857.5 205.2L856.9 203.3C856.3 203.5 855.7 203.6 855 203.8Z" fill="currentColor"/>
      <path d="M863.9 225.5L864.3 227.4C865 227.3 865.6 227.1 866.3 226.9L865.8 225C865.1 225.2 864.5 225.3 863.9 225.5Z" fill="currentColor"/>
      <path d="M838.4 233.7L838.9 235.7C839.6 235.5 840.3 235.2 841 234.9L840 233.1C839.5 233.4 839 233.6 838.4 233.7Z" fill="currentColor"/>
      <path d="M860.2 225.8L860.1 227.8C860.3 227.8 860.5 227.8 860.6 227.8C861.2 227.8 861.7 227.8 862.3 227.7L862 225.8C861.4 225.8 860.8 225.9 860.2 225.8Z" fill="currentColor"/>
      <path d="M879.5 221.3L879.5 223.3L879.6 223.3C880.1 223.3 880.6 223.3 881 223.5L881.9 221.7C881.1 221.4 880.4 221.3 879.6 221.3L879.5 221.3Z" fill="currentColor"/>
      <path d="M831.4 231.4C831.5 232.3 831.9 233.1 832.4 233.8L834 232.5C833.6 232.1 833.5 231.7 833.4 231.2L831.4 231.4Z" fill="currentColor"/>
      <path d="M876.1 221.9L875.3 222.1L875.9 224L876.6 223.8C877 223.7 877.4 223.6 877.7 223.5L877.3 221.6C876.9 221.7 876.5 221.8 876.1 221.9Z" fill="currentColor"/>
      <path d="M871.5 223.3L873.4 222.7L874 224.6L872.1 225.2L871.5 223.3Z" fill="currentColor"/>
      <path d="M867.7 224.4L869.6 223.8L870.2 225.8L868.3 226.3L867.7 224.4Z" fill="currentColor"/>
      <path d="M844.5 229.6L846 228.2L847.3 229.7L845.8 231L844.5 229.6Z" fill="currentColor"/>
      <path d="M834.3 235.2C835 235.6 835.8 235.8 836.6 235.9L836.8 233.9C836.2 233.8 835.7 233.7 835.2 233.4L834.3 235.2Z" fill="currentColor"/>
      <path d="M841.6 232.1L842.8 233.7C843.3 233.3 843.8 232.9 844.4 232.4L843 230.9C842.5 231.4 842 231.8 841.6 232.1Z" fill="currentColor"/>
      <path d="M853.2 226.8L853.1 227.2L854.8 228.1L855 227.8C855.2 227.3 855.5 226.9 855.7 226.5L854.1 225.3C853.8 225.8 853.5 226.3 853.2 226.8Z" fill="currentColor"/>
      <path d="M850.2 227L850.2 227L848.9 225.5L847.4 226.9L848.4 228V228C848.4 228.3 848.5 228.7 848.6 229.1L850.5 228.5C850.5 228.3 850.4 228.1 850.4 228C850.4 227.7 850.5 227.4 850.6 227.1L850.2 227Z" fill="currentColor"/>
      <path d="M855.8 226.6C856.5 227 857.2 227.3 857.9 227.5L858.5 225.6C857.9 225.4 857.4 225.2 856.9 224.9L855.8 226.6Z" fill="currentColor"/>
      <path d="M851.1 229L851.1 229L850.9 231C851 231 851.1 231 851.1 231C852 230.9 852.8 230.6 853.5 230L852.1 228.5C851.9 228.8 851.5 228.9 851.1 229Z" fill="currentColor"/>
      <path d="M1114.7 368.2C1113.1 348.8 1107.3 330 1098.9 312.5C1090.3 294.9 1079.5 278.4 1066.5 263.6C1059.4 255.5 1051.6 248 1044 240.4C1035 231.4 1026.1 222.4 1017.2 213.4C1008.4 204.4 999.5 195.3 990.6 186.3C987.3 183 984.1 178.7 979.4 177.4C977.8 176.9 975.7 176.9 974.4 178.1C974.3 178.2 974.2 178.3 974.1 178.4L959.8 151.7C956.7 145.9 953.7 139.9 949.9 134.5C946.4 129.2 941.7 124.9 936.3 121.6C927.8 116.7 918 114.7 908.2 115.7C908.2 98.9 905.3 82.2 899.7 66.3C899.7 66.1 899.6 65.9 899.4 65.7C899.3 65.6 899.1 65.4 898.9 65.3C898.6 65.3 898.4 65.2 898.2 65.2C898 65.2 897.7 65.3 897.5 65.4C885.2 72.5 871.9 77.8 858 81.2C844.2 84.6 830 86.6 815.7 87.4C807.7 87.8 799.5 88 791.4 87.9C791.2 87.9 790.9 87.9 790.7 88.1C790.5 88.2 790.3 88.4 790.2 88.6C790 88.9 790 89.1 790 89.4C790 89.6 790 89.9 790.1 90.1C802.5 113.9 812.1 139.8 814.2 166.7C815.2 180.1 814.4 193.5 811.7 206.7C809.1 220.2 805.4 233.5 803.5 247.1C802.3 254.6 802 262.3 802.4 269.9C802.9 277.9 804.6 285.7 806.3 293.5C806.4 293.8 806.5 294 806.7 294.2C806.9 294.3 807.1 294.5 807.4 294.5C807.6 294.6 807.9 294.6 808.1 294.5C808.4 294.5 808.6 294.3 808.8 294.2C819.1 284.6 831.9 278.2 845.2 274C860.2 269.3 875.9 267.4 891.5 265.8C899.1 265.1 907.7 263.9 914.7 268C916.1 268.8 917.3 267.2 916.7 265.9C911.1 253.5 909.1 239.2 909.3 225.6C909.3 222.9 909.5 220.1 909.7 217.3C911.2 218.7 912.7 220.1 914.1 221.5C911.3 225.4 910.9 230.3 911.8 234.8C912.9 239.8 915.9 244.1 919.2 247.9C922.7 252 926.6 255.7 930.2 259.8C934 264.1 937.5 268.6 941 273.2C948 282.4 954.4 292.1 960.8 301.8C967.3 311.9 973.8 322 980 332.3C983.1 337.3 986.1 342.3 989.1 347.4C993.4 353.9 997.7 360.3 1002 366.8C1006.9 374.1 1011.9 381.6 1018.8 387.3C1019.1 387.6 1019.2 387.9 1019.2 388.3C1019.2 388.7 1019.1 389.1 1018.8 389.4C1018.5 389.7 1018.1 389.8 1017.8 389.8C1017.4 389.8 1017 389.7 1016.7 389.4C1012.8 386.1 1009.3 382.3 1006.3 378.2C1003.6 374.6 1001 370.7 998.5 366.9C995.7 362.7 992.8 358.4 990 354.1C989.3 353.1 988.6 352.1 987.9 351.1C984.2 349.1 980.5 347.1 976.8 345.1C964.7 338.6 952.1 332.9 939.1 328.1C914.2 319.1 886.2 315 860.4 323.1C846.1 327.6 833.4 335.9 818.8 339.3C818.5 339.4 818.2 339.5 818 339.8C817.8 340 817.7 340.3 817.7 340.6C817.6 340.4 817.5 340.3 817.4 340.1C815.9 338.3 814.4 336.4 813 334.5C810.3 330.8 807.7 326.9 805 323.1C803.6 321.2 802.1 319.2 800.6 317.4C799.3 315.7 797.8 314.1 796.3 312.6C794.4 310.7 792.2 309.1 789.8 307.8C789.2 307.4 788.5 307.2 787.8 307C787 300.9 786.2 294.7 785.4 288.6C784.2 279.5 783.1 270.5 781.9 261.4C792.7 256.9 800.2 246.2 801.4 234.6C802.1 228.4 800.7 222.1 797.3 216.8C795.7 214.4 793.7 212.3 791.2 210.7C794 205.6 796.3 200.1 796.4 194.2C796.5 187.9 793.5 182.4 790.8 176.9C785.6 166.6 779.8 156.2 770.1 149.6C765.6 146.4 760.3 144.5 754.9 143.9C753.6 143.8 752.3 143.9 751 143.9C750 144 749 143.8 748.2 143.3C747.9 143 747.8 142.7 747.7 142.3C747.5 141.6 747.2 141 746.9 140.4C746.1 139.4 745.1 138.6 743.9 138.2C741.4 137.2 738.4 137.2 735.7 137.2C732.5 137.1 729.3 137.2 726.1 137.5C719.5 138 713.1 139 706.6 140.4C700.4 141.7 694.1 143.2 687.9 144.8C682 146.3 676.1 147.8 670.3 149.9C667.4 150.9 664.5 152.1 661.6 153.4C658.9 154.6 656.4 156 653.9 157.5C651.5 159 649.4 161.2 648 163.7C646.8 166.1 646.2 168.7 646.1 171.4C645.9 177 647.6 182.7 649.4 188C651.4 193.7 653.9 199.2 657 204.5C657.6 205.8 658.5 207 659.5 208.1C659.8 208.3 660.2 208.5 660.5 208.6C660.1 210.4 660 212.3 660.2 214.1C660.3 216.2 660.5 218.2 660.7 220.2C661.3 228.9 661.9 237.6 662.1 246.3C662.3 254.8 662 263.4 661.6 272C661.3 276 661.3 280.1 661.6 284.2C661.9 288.1 662.7 292 663.9 295.7C665.8 301.2 668.5 306.4 672.1 311C675.5 315.2 679.7 318.7 684.4 321.2C689.7 324 695.3 325.8 701.2 326.5C703.6 326.9 706 327.1 708.5 327.2C706.8 328.1 705.2 329 703.6 330C701.6 331.3 699.7 332.7 697.7 334C695.8 335.3 694 336.7 692.3 338.2C690.5 339.9 689.3 342.1 688.8 344.5C688.8 344.8 688.7 345.1 688.7 345.5C674.3 346.3 659.4 344.7 644.7 344.9C641.5 344.5 638.2 344.7 635.1 345.3C634.8 345.4 634.6 345.4 634.4 345.5C624.5 346.4 614.8 348.6 605.7 353.4C602 355.4 598.6 357.8 595.5 360.7C595.4 360.8 595.3 360.9 595.1 361.1C592.6 363.2 590.2 365.5 587.8 367.8C583 372.3 578.4 377.1 574 382C565.2 392 557.8 403 550.4 414C546.3 420.3 542.1 426.5 537.6 432.6C533.2 438.5 528.3 444.1 523.4 449.7C515.7 448.6 508.1 447.7 500.4 447L500 433.8C499.9 431.4 499.9 428.9 499.8 426.5C499.7 424.2 499.6 421.8 499.7 419.5C499.7 417.5 500.3 415.6 501.3 413.9C502.4 412.2 503.2 410.3 503.7 408.3C503.9 406.6 503.7 404.9 503.1 403.3C502.4 401.7 501.4 400.2 500.1 399.1C497.4 396.6 494 395.1 490.3 394.7C492.4 385.9 496 377.5 498.3 368.8C501.1 358.6 501.3 347.8 498.9 337.5C497.7 332.4 495.8 327.6 493.2 323.1C490.9 319 487.4 314.1 482.1 314.6C482.2 314.4 482.2 314.3 482.2 314.1C482.5 311.3 482.1 308.4 481 305.8C480 303.1 478.5 300.7 476.4 298.7C474.4 296.8 471.9 295.5 469.3 294.8C466.6 294.1 463.7 294.2 461.1 294.9C458.5 295.6 456.2 297 454.4 298.9C452.2 301.3 450.8 304.3 450.2 307.5C449.2 311.6 448.5 315.8 448.2 320.1C447.8 319.1 447.4 318.1 447.1 317.1C446.1 313.8 445.5 310.3 445.3 306.8C445.1 305 445.1 303.3 445.2 301.5C445.3 299.9 445.2 298.3 445.1 296.6C444.6 293.6 442.7 290.9 439.5 290.3C438.1 290.1 436.6 290.2 435.2 290.6C433.8 291 432.5 291.7 431.5 292.7C429.1 294.9 427.9 298.2 427.4 301.2C426.8 304.9 426.5 308.5 426.5 312.2C426.4 316.4 426.5 320.6 426.8 324.7C426.7 324.4 426.5 324 426.4 323.6C425.6 321.3 424.7 319 423.9 316.8C423 314.5 422.3 312.2 421.3 310C420.9 309 420.2 308.2 419.4 307.6C418.5 306.9 417.5 306.6 416.5 306.5C415.5 306.4 414.5 306.6 413.5 306.9C412.6 307.3 411.8 307.9 411.1 308.6C409.7 310.2 408.6 312.1 408.2 314.1C407.6 316.4 407.2 318.8 407.1 321.1C407 325.8 407.5 330.5 408.4 335.1C409.2 339.6 410.3 344 411.5 348.4C413.8 357.2 416.5 365.9 418.5 374.8C420.3 382.2 421.2 389.7 421.3 397.3C415.2 396.9 409.3 402 409.2 408.2C409.2 410.6 410.1 412.8 410.6 415.1C411.5 419.8 410.3 424.7 409.3 429.3C408.4 433.9 407.4 438.4 406.4 443C389.5 442.9 372.6 443.2 355.7 443.8C328.3 444.8 300.8 446.4 273.7 450.5C265.2 451.6 256.8 453.4 248.6 455.8C244.7 457 239 458.6 236.8 462.4C236.4 463.1 236.2 463.8 236.2 464.6C236.2 464.6 236.2 464.6 236.2 464.6V544.4C236.2 547.7 236 551.1 236.2 554.4L236.2 554.5L236.2 554.5V634.3C236.2 637.6 236 641 236.2 644.3L236.2 644.3L236.2 644.4V692.6H216.3C216.1 692.6 215.8 692.6 215.6 692.8C215.3 692.9 215.2 693.1 215 693.3C200.5 721.1 185.9 748.9 171.4 776.7C169.3 780.6 167.2 784.5 165.2 788.5C165.1 788.7 165 788.9 165 789.2C165 789.5 165.1 789.7 165.2 790C165.3 790.2 165.5 790.4 165.7 790.5C166 790.6 166.2 790.7 166.5 790.7H551.3C555.5 790.7 559.7 790.8 564 790.7H1007C1018.3 790.7 1029.7 790.9 1041 790.7C1041.5 790.7 1042 790.7 1042.5 790.7C1042.8 790.7 1043 790.6 1043.3 790.5C1043.5 790.4 1043.7 790.2 1043.8 790C1043.9 789.7 1044 789.5 1044 789.2C1044 788.9 1043.9 788.7 1043.8 788.5C1029.2 760.7 1014.7 732.9 1000.1 705.1C998.1 701.2 996 697.2 994 693.3C993.8 693.1 993.7 692.9 993.4 692.7C993.2 692.6 992.9 692.5 992.7 692.6L992.7 692.6H947.2C944.8 668.1 939.8 644 932.1 620.7C930.3 615.3 928.4 609.9 926.4 604.6C930.8 601 934.1 596.5 935.3 590.6C936.3 585.4 935.5 579.8 932 575.7C930.1 573.5 926.7 572 925.8 569.1C925.5 567.3 925.5 565.5 925.9 563.8C926.2 561.8 926.5 559.7 926.8 557.7L941.1 461.7C941.1 461.5 941.1 461.4 941.2 461.2C944.3 462.5 947.5 463.8 950.7 465C970.8 472.5 992.2 477.7 1013.8 477.2C1032.2 476.8 1050.8 472.6 1067 463.8C1075 459.5 1082.2 454.1 1088.5 447.6C1095.1 440.7 1100.5 432.7 1104.6 424C1112.8 406.6 1116.3 387.4 1114.7 368.2ZM910.2 256.6C910.9 259 911.7 261.4 912.6 263.7C907.1 261.7 901 262 895.2 262.5C887.1 263.2 879.1 264.1 871 265.3C855.8 267.5 840.6 271.2 826.8 278.2C820.3 281.5 814.2 285.5 808.7 290.3C807.2 284.1 806.2 277.8 805.5 271.4C805 264.6 805.1 257.6 806 250.8C807.6 237.1 811.2 223.8 814 210.4C816.7 197 818.2 183.6 817.5 170C816.6 156.6 814.1 143.4 810.2 130.5C805.9 116.9 800.5 103.6 793.9 90.9C807.7 91.1 821.4 90.3 835.1 88.5C849.4 86.8 863.4 83.4 876.9 78.4C884 75.8 890.9 72.6 897.5 68.9C902.5 84 905.2 99.8 905.3 115.8C905.3 115.9 905.3 116 905.3 116C903.7 116.3 902.1 116.6 900.5 117C894.2 118.6 888.3 121.2 882.9 124.7C879.9 126.5 877.1 128.7 874.6 131.1L872 130.5C871.2 130.3 870.3 130.3 869.5 130.6L870.3 132.5C870.6 132.3 871.1 132.3 871.5 132.4L871.7 131.7L872 132.4L874.4 131.3C872.7 132.9 871.1 134.7 869.8 136.6C868.1 139 866.8 141.5 865.9 144.2C865 147 864.7 150 865 153C865.1 153.7 865.3 154.5 865.7 155.1C866.1 155.8 866.6 156.4 867.2 156.8C867.5 157 867.7 157.1 867.9 157.2C867.1 158 866.3 158.9 865.5 159.8C863.3 162.4 861 165.4 860.4 168.9C860.1 170.5 860.2 172.1 860.7 173.6C861.3 175.2 862.3 176.5 863.6 177.5C864 177.8 864.4 178 864.9 178.2C863 179.8 861.6 181.9 860.6 184.3C859.7 186.6 859.3 189.1 859.4 191.6C859.7 195 861 198.3 863.3 200.9C863 201.1 862.7 201.2 862.5 201.3L863.2 203.1C863.6 203 864 202.8 864.4 202.6L864 201.7C864.2 201.9 864.4 202 864.6 202.2C866.4 203.8 868.5 204.7 870.9 205C872 205.1 873.1 204.9 874.1 204.4C875.2 204 876.1 203.3 876.7 202.4C877.4 201.5 877.9 200.5 878 199.4C881.2 201.9 885.3 203.6 889 205.1C892.7 206.5 896.2 208.1 899.6 210C902.2 211.5 904.6 213.2 907 215C905.4 229 906.5 243.1 910.2 256.6ZM972.1 196.8C969 201.1 964.4 204.2 960.2 207.4C951.5 213.8 941.8 220.2 930.9 222.1C926.6 222.9 922.2 222.6 918 221.4C913.7 216.5 908.7 212.2 903.2 208.7C899.7 206.6 896 204.7 892.2 203.2C889 201.9 885.8 200.5 882.7 198.9C881.1 198.1 879.6 197 878.3 195.7C878.1 195.5 877.8 195.2 877.6 194.9C877.1 193.4 876.3 192 875.2 190.8C875 190.5 874.7 190.4 874.3 190.4C874 190.3 873.7 190.4 873.4 190.5C873.1 190.7 872.9 191 872.8 191.3C872.6 191.6 872.6 191.9 872.7 192.2C873.2 193.7 873.9 195 874.9 196.2C874.9 196.4 874.9 196.5 875 196.6C875 196.8 875 197 875.1 197.1C875.1 197.3 875.1 197.2 875.1 197.1C875.1 197.2 875.1 197.3 875.1 197.4C875.1 197.8 875.1 198.2 875.1 198.6C875.1 198.6 875.1 198.7 875.1 198.7L875.1 198.8C875 199 875 199.2 874.9 199.4C874.9 199.5 874.8 199.7 874.8 199.9L874.8 199.9C874.7 200 874.7 200.1 874.7 200.2C874.6 200.3 874.5 200.4 874.4 200.6C874.4 200.6 874.3 200.7 874.3 200.7C874.3 200.8 874.3 200.8 874.3 200.8C874.1 200.9 874 201 873.9 201.1C873.9 201.2 873.8 201.2 873.7 201.3C873.7 201.3 873.6 201.4 873.6 201.4C872.9 201.8 872.1 202 871.4 202C869.6 201.9 868 201.2 866.7 200.1C865.5 199.1 864.4 197.8 863.7 196.3C863.1 194.9 862.6 193.4 862.4 191.8C862.1 188.5 863.1 185.1 865.1 182.4C866.3 180.8 867.7 179.4 869.4 178.3C870.7 178 871.9 177.5 873.1 176.8C873.1 177.2 873.1 177.5 873.2 177.8C873.2 178.2 873.3 178.6 873.6 178.9C873.9 179.2 874.3 179.3 874.7 179.3C875.4 179.3 876.3 178.7 876.2 177.8C876.1 177.3 876.1 176.7 876.1 176.2C876.1 176 876.1 175.7 876.2 175.5C876.2 175.4 876.2 175.3 876.2 175.3C876.2 175.2 876.2 175.1 876.3 174.9C876.3 174.7 876.4 174.4 876.5 174.2C876.5 173.9 876.6 173.7 876.7 173.4C876.5 173.8 876.8 173.4 876.8 173.3C876.8 173.2 876.9 173.1 876.9 173C877.1 172.8 877.2 172.5 877.4 172.3C877.6 171.9 877.6 171.5 877.5 171.1C877.4 170.8 877.2 170.4 876.8 170.2C876.5 170 876.1 170 875.7 170.1C875.3 170.2 875 170.4 874.8 170.8C874.3 171.5 874 172.3 873.7 173.1C871.8 173.6 869.9 174.5 868.2 175.6C867.3 175.7 866.4 175.6 865.5 175.2C863.5 174.1 862.9 171.5 863.4 169.2C864 166.4 865.9 163.9 867.8 161.7C869.4 159.9 871.2 158.1 873.2 156.6C874 156.2 874.7 155.7 875.4 155.1C875.4 155 875.4 155 875.4 155C877.2 153.9 879 152.9 880.9 152.1C880.8 152.5 880.9 152.8 881.1 153.1C881.3 153.4 881.6 153.7 881.9 153.8C882.3 153.9 882.7 153.8 883.1 153.6C883.4 153.4 883.7 153.1 883.8 152.7C884.1 151.3 884.4 149.9 884.9 148.5C885 148.2 885.2 147.8 885.3 147.5C885.3 147.3 885.4 147.2 885.5 147C885.5 146.9 885.6 146.8 885.6 146.7L885.6 146.7C885.9 146 886.2 145.4 886.5 144.7C886.7 144.3 886.8 143.9 886.7 143.6C886.6 143.2 886.3 142.9 886 142.7C885.7 142.5 885.3 142.4 884.9 142.5C884.5 142.6 884.2 142.8 884 143.2C883.1 144.8 882.4 146.6 881.8 148.4C879 147.9 876.5 149.9 874.5 151.8C874.2 152.1 873.8 152.4 873.4 152.8C872.8 153.2 872.2 153.6 871.6 154C871.5 154.1 871.4 154.1 871.3 154.2C870.9 154.4 870.5 154.5 870 154.6C869.8 154.6 869.6 154.6 869.4 154.6C869.2 154.5 868.9 154.4 868.7 154.2C868 153.7 867.9 152.4 867.9 151.4C867.8 150.1 867.9 148.8 868.2 147.5C868.7 145 869.6 142.5 871 140.2C873.9 135.7 877.7 131.7 882.1 128.7C887.2 125.2 892.7 122.4 898.6 120.6C909.7 117.2 922 117.6 932.5 122.9C937.8 125.6 942.3 129.4 945.9 134C949.7 139 952.6 144.6 955.5 150.1L975.4 187.1C975.4 190.6 974.3 194 972.1 196.8ZM236.2 734.2V787.7H179.7C176.2 787.7 172.5 787.3 169 787.6C176.1 774.1 183.2 760.6 190.3 747C195.8 736.4 201.4 725.8 206.9 715.2C210.2 709 214.3 702.6 217 696.1C217 695.9 217.1 695.8 217.2 695.6C217.5 695.6 217.8 695.5 218.1 695.6C219.4 695.7 220.7 695.6 222 695.6H236.2V723C236.2 726.4 235.5 730.3 236.1 733.7C236.1 733.9 236.1 734 236.2 734.2L236.2 734.2L236.2 734.2ZM437.1 293.2C437.1 293.2 437 293.2 437.1 293.2ZM415.8 353.2C414.7 349 413.5 344.7 412.6 340.4C411.5 336.2 410.8 331.9 410.3 327.6C409.8 323.2 410.1 318.8 411.2 314.5C411.5 312.9 412.4 311.3 413.8 310.2C414.3 309.8 415 309.6 415.7 309.5C416.3 309.4 417 309.5 417.6 309.9C418.1 310.4 418.6 311.1 418.8 311.8C419.3 312.8 419.6 313.9 420 315C420.8 317.2 421.7 319.4 422.5 321.6L427.4 335C427.8 336 428.1 336.9 428.5 337.9C428 338.1 427.4 338.2 426.9 338.4C426.7 338.5 426.5 338.5 426.3 338.7C426.2 338.8 426.1 338.9 426 339.1C425.9 339.3 425.8 339.5 425.8 339.7C425.7 339.9 425.8 340.1 425.8 340.2C425.9 340.4 426 340.6 426.1 340.8C426.2 340.9 426.3 341.1 426.5 341.2C426.7 341.2 426.9 341.3 427.1 341.3C427.3 341.4 427.5 341.3 427.7 341.3C430.2 340.5 432.7 339.6 435.2 338.6C435.6 338.4 435.9 338.2 436.1 337.9C436.3 337.5 436.4 337.1 436.3 336.7C436.2 336.3 435.9 336 435.6 335.8C435.2 335.6 434.8 335.6 434.4 335.7C433.4 336.1 432.4 336.5 431.4 336.8C430.2 330.1 429.5 323.2 429.4 316.3C429.4 312.7 429.5 309.1 429.9 305.4C429.9 302.6 430.6 299.9 431.7 297.3C432.2 296.3 433 295.3 433.9 294.5C434.8 293.8 436 293.3 437.1 293.2L437.2 293.2C437.4 293.2 437.6 293.2 437.7 293.2C438 293.2 438.2 293.2 438.5 293.2C438.7 293.2 439 293.2 439.2 293.3C439.3 293.3 439.4 293.4 439.5 293.4C439.6 293.4 439.6 293.5 439.7 293.5C439.7 293.5 439.8 293.5 439.8 293.5C440.3 293.8 440.7 294.1 441 294.5C441.4 294.9 441.6 295.3 441.8 295.8C442.2 297.1 442.3 298.4 442.2 299.7C442.2 301.3 442.1 302.9 442.2 304.5C442.3 311.6 444 318.6 447 325.1C447.3 325.7 447.5 326.2 447.8 326.7C447.8 328.3 447.8 329.9 447.8 331.5L446.1 331.9C445.7 332 445.4 332.3 445.2 332.6C445 332.9 445 333.4 445.1 333.7C445.2 334.1 445.5 334.4 445.8 334.6C446.1 334.8 446.5 334.9 446.9 334.8L455.8 332.6C456.2 332.5 456.5 332.2 456.7 331.9C456.9 331.6 456.9 331.1 456.8 330.8C456.7 330.4 456.5 330.1 456.1 329.9C455.8 329.7 455.4 329.6 455 329.7L452.1 330.4C452.1 329.1 451.8 327.9 451.2 326.7C451.1 326.5 450.9 326.2 450.8 326C450.9 321.4 451.4 316.9 452.2 312.4C452.8 309.4 453.3 306.2 454.7 303.5C455.7 301.5 457.3 299.9 459.3 298.9C461.2 297.8 463.4 297.3 465.6 297.3C467.7 297.3 469.9 297.9 471.8 299C473.8 300.2 475.5 301.9 476.8 303.9C478.1 305.9 478.9 308.2 479.2 310.6C479.4 311.8 479.4 313 479.2 314.3C479.1 314.7 478.8 315.2 478.5 315.6C478.1 316.1 477.6 316.5 477 316.8C476.5 317 475.9 317.1 475.4 317.1C474.8 317 474.3 316.7 473.9 316.3C472.7 315.2 471.8 313.9 471.1 312.5C471 312.5 471 312.4 470.9 312.3C469.9 310.9 468.7 309.7 467.2 308.7C466.9 308.5 466.5 308.5 466.1 308.6C465.7 308.7 465.4 308.9 465.2 309.3C465 309.6 464.9 310 465 310.4C465.1 310.8 465.4 311.1 465.7 311.3C465.9 311.5 466.2 311.6 466.4 311.8C466.9 312.2 467.3 312.6 467.7 313C466.7 314.3 466.2 316 466.3 317.7C466.3 320.6 466.4 323.5 466.8 326.4C467.1 329.5 467.7 332.5 468.4 335.4C468.8 336.9 469.2 338.3 469.6 339.7C469.9 340.9 470.4 342 471 343.1C471.3 343.4 471.5 343.7 471.8 344C469.2 346.3 467.6 349.5 466.1 352.6C465.9 352.9 465.9 353.3 466 353.7C466.1 354.1 466.3 354.4 466.7 354.6C467 354.8 467.4 354.9 467.8 354.8C468.2 354.7 468.5 354.4 468.7 354.1C469.6 352 470.7 350 472 348.2C472 348.1 472.2 347.9 472.3 347.8C472.5 347.6 472.6 347.4 472.8 347.2C473.1 346.8 473.5 346.5 473.9 346.2C474.2 345.9 474.5 345.6 474.9 345.4C475.1 345.3 475.3 345.2 475.5 345.1C476.4 344.8 477.2 344.3 477.9 343.6C479.5 341.9 480.6 339.7 480.9 337.3C481.2 334.5 481 331.7 480.3 329C479.7 326.5 478.8 323.8 479 321.1C479 320.1 479.4 319.2 480.1 318.5C480.7 317.9 481.5 317.6 482.3 317.6C483.2 317.5 484.1 317.7 484.9 318.1C485.9 318.6 486.8 319.3 487.6 320.2C489.2 322.1 490.6 324.2 491.7 326.5C492.9 328.7 493.9 331.1 494.7 333.5C497.9 343.3 498.5 353.8 496.4 364C494.1 375.1 489.1 385.4 486.9 396.6C486.7 397.4 486.6 398.2 486.5 399C485.1 401.6 483.1 403.8 480.6 405.4C476.7 407.8 472.5 409.4 468 410.1C462 411.3 456 411.7 449.9 411.4C446.8 411.3 443.7 411 440.6 410.5C437.6 410.1 434.6 409.5 431.6 408.6C429.2 407.9 426.9 406.6 425.1 404.8C424.9 404.6 424.7 404.4 424.5 404.2C424.3 404 424.2 403.8 424.1 403.6C424 403.6 424 403.5 423.9 403.4C424.6 395.1 424.1 386.8 422.3 378.7C420.7 370 418.2 361.6 415.8 353.2ZM476.7 326.8C477.4 329.4 477.9 332.1 478.1 334.8C478.2 336.9 477.6 339.1 476.3 340.8C476 341.3 475.6 341.7 475.2 342C475 342 474.9 342 474.8 342.1C474.7 342.1 474.6 342.2 474.6 342.2C474.5 342.2 474.5 342.2 474.4 342.2C474.4 342.2 474.4 342.2 474.3 342.2C474.3 342.2 474.2 342.1 474.2 342.1C474.1 342.1 474.1 342.1 474.1 342.1C474.1 342.1 474.1 342 474 342C473.9 341.9 473.9 341.9 473.8 341.8C473.5 341.4 473.2 341 473 340.5C472.6 339.3 472.2 338.1 471.9 336.9C471.5 335.5 471.1 334 470.8 332.6C470.2 329.8 469.8 326.9 469.5 324.1C469.4 322.6 469.3 321.2 469.3 319.8C469.3 319.1 469.3 318.4 469.3 317.7C469.3 317.4 469.3 317.2 469.3 316.9C469.3 316.7 469.3 316.5 469.4 316.3C469.4 316.1 469.5 315.9 469.5 315.7C471 318 472.9 320.1 475.7 320.1C475.9 320.1 476 320.1 476.1 320C475.9 322.3 476.1 324.6 476.7 326.8ZM563 674.7V693.3L561.9 691.7C561.4 692.1 560.8 692.4 560.3 692.7L561.3 694.5C561.9 694.1 562.5 693.7 563 693.3V723.2C563 726.7 563 730.2 563 733.7C562.8 735.5 561.6 736.3 559.9 737.3C559.7 737.5 559.4 737.6 559.1 737.7C558.5 738 557.9 738.3 557.3 738.6C557.1 738.7 556.9 738.7 556.7 738.8C556.4 739 556 739.1 555.7 739.2C551.4 740.7 547 741.9 542.6 742.8C540.5 743.2 538.5 743.6 536.5 744C535.4 744.2 534.3 744.4 533.2 744.6C532.2 744.7 531.2 744.9 530.3 745C528.2 745.4 526 745.7 523.9 746C517.3 747 510.6 747.7 504 748.4C498.9 748.9 493.8 749.3 488.7 749.7C485.1 750 481.5 750.3 477.9 750.5C473.3 750.8 468.7 751.1 464.1 751.3C461.8 751.4 459.4 751.5 457 751.6C449.1 752 441.2 752.3 433.2 752.5C426.7 752.6 420.2 752.7 413.6 752.8C404.3 752.9 394.9 752.9 385.6 752.8C376.2 752.7 366.8 752.4 357.4 752.1C355.5 752.1 353.5 752 351.6 751.9C347.6 751.8 343.7 751.6 339.7 751.4C335.7 751.2 331.7 751 327.8 750.7C324.2 750.5 320.7 750.3 317.2 750C311.5 749.6 305.9 749.1 300.2 748.6C299.6 748.5 298.9 748.5 298.3 748.4C297.6 748.3 296.9 748.2 296.2 748.2C292 747.7 287.8 747.2 283.6 746.7C282.5 746.6 281.5 746.4 280.4 746.3C279.1 746.1 277.9 746 276.6 745.8C273.4 745.3 270.3 744.8 267.2 744.3C267.1 744.3 267 744.3 266.9 744.2C266.5 744.2 266.1 744.1 265.8 744C261.6 743.3 257.5 742.4 253.5 741.3C252.7 741.1 251.9 740.9 251.1 740.7C250.9 740.6 250.7 740.6 250.5 740.5C250.2 740.4 249.9 740.3 249.6 740.2C249.3 740.1 249 740 248.7 739.9C248.5 739.9 248.4 739.8 248.2 739.8C247.7 739.6 247.3 739.5 246.8 739.3C246.7 739.3 246.6 739.2 246.5 739.2C246 739 245.4 738.8 244.9 738.6C244.7 738.5 244.6 738.4 244.4 738.4C244.4 738.3 244.3 738.3 244.2 738.3C243.9 738.2 243.6 738 243.4 737.9C243.1 737.8 242.9 737.7 242.7 737.6L242.7 737.5C242.5 737.5 242.4 737.4 242.3 737.3C242.2 737.3 242 737.2 241.9 737.1C241.5 736.9 241.1 736.6 240.8 736.4C240.5 736.2 240.3 736 240.1 735.8L240 735.8C240 735.7 239.9 735.6 239.9 735.6C239.8 735.5 239.7 735.4 239.6 735.3C239.6 735.3 239.6 735.3 239.6 735.2L239.5 735.2L239.5 735.2C239.4 735.1 239.3 734.8 239.2 734.7L239.2 734.6C239.2 734.6 239.2 734.5 239.2 734.5C239.2 734.4 239.2 734.4 239.1 734.4C239.1 734.3 239.1 734.3 239.1 734.2C239.1 734.2 239.1 734.1 239.1 734C239.2 732.8 239.1 731.6 239.1 730.3V693.3C239.3 693.4 239.5 693.6 239.7 693.7L240.8 692.1C240.3 691.7 239.9 691.4 239.5 690.9L239.1 691.2V649.1C240.8 650.2 242.6 651.1 244.5 651.8L244.6 651.8C245.9 652.3 247.2 652.8 248.5 653.2C248.6 653.2 248.6 653.2 248.7 653.2C249 653.3 249.4 653.5 249.8 653.6C255.3 655.2 260.9 656.4 266.6 657.3C266.8 657.3 267.1 657.4 267.3 657.4C268.2 657.6 269.2 657.7 270.1 657.9C270.8 658 271.6 658.1 272.3 658.2C272.4 658.3 272.5 658.3 272.6 658.3C291.2 661.1 309.9 663 328.7 663.9C347.8 665.1 367 665.7 386.2 665.9C386.5 665.9 386.8 665.9 387.2 665.9C387.5 665.9 387.9 665.9 388.3 665.9C405.8 666.1 423.4 665.9 440.9 665.4C458.1 664.9 475.3 664 492.4 662.5C493.9 662.4 495.3 662.3 496.8 662.2C496.9 662.1 496.9 662.1 497 662.1C497.2 662.1 497.4 662.1 497.6 662.1C498.7 662 499.9 661.9 501 661.8C501.7 661.7 502.3 661.6 503 661.6C503.7 661.5 504.3 661.4 505 661.4C511.8 660.7 518.6 659.9 525.4 658.9C529.6 658.3 533.8 657.7 538 656.9C543.6 655.9 549.2 654.6 554.7 652.8C554.8 652.8 554.9 652.7 555 652.7C555.3 652.6 555.5 652.5 555.7 652.5C558.3 651.7 560.8 650.6 563 649.1L563 674.7ZM563 573.2V603.4L561.9 601.8C561.4 602.2 560.8 602.6 560.3 602.9L561.3 604.6C561.9 604.2 562.5 603.9 563 603.4V633.3C563 636.9 563 640.6 563 644.2C563 644.3 563 644.3 563 644.4C563 644.4 563 644.5 563 644.5C563 644.6 563 644.7 563 644.8C562.9 644.8 562.8 645.2 562.6 645.3L562.6 645.3L562.6 645.3C562.6 645.4 562.6 645.4 562.6 645.4C562.6 645.4 562.6 645.4 562.5 645.5C562.4 645.6 562.3 645.7 562.2 645.9L562.1 645.9C561.9 646.2 561.6 646.4 561.3 646.6C560.8 646.9 560.4 647.2 560 647.4C559.1 647.9 558.3 648.3 557.4 648.7C557.3 648.7 557.3 648.7 557.2 648.7C557 648.8 556.9 648.9 556.7 648.9C556.2 649.1 555.8 649.3 555.3 649.4C551.1 650.9 546.7 652.1 542.3 653C540.3 653.4 538.4 653.8 536.5 654.1C535.3 654.3 534.1 654.5 532.9 654.7C531.5 655 530 655.2 528.6 655.4C520.4 656.7 512.2 657.7 504 658.5C493.4 659.5 482.8 660.4 472.2 661C467.1 661.3 461.9 661.5 456.8 661.8C443.1 662.4 429.4 662.8 415.7 662.9C415.3 662.9 415 662.9 414.7 662.9C410.1 662.9 405.6 663 401.1 663C387.7 663 374.2 662.8 360.8 662.4C360.5 662.4 360.2 662.4 359.9 662.4C359.2 662.3 358.5 662.3 357.8 662.3C344.3 661.8 330.7 661.1 317.2 660.1C315.8 660 314.4 659.9 312.9 659.8C311.1 659.7 309.4 659.5 307.6 659.4C302.4 658.9 297.3 658.4 292.1 657.8C291.3 657.8 290.4 657.7 289.6 657.6C289.3 657.5 289 657.5 288.7 657.5C287.4 657.3 286.1 657.2 284.8 657C284.7 657 284.6 657 284.5 657C283.2 656.8 281.8 656.6 280.4 656.4C277.9 656.1 275.3 655.7 272.8 655.3C270.2 654.9 267.6 654.5 265.1 654C261.1 653.3 257.1 652.4 253.2 651.4C252.6 651.2 252 651 251.3 650.9C250.5 650.6 249.7 650.4 248.8 650.1C248.6 650 248.3 650 248.1 649.9C247.8 649.8 247.5 649.7 247.2 649.6C247.1 649.5 246.9 649.5 246.8 649.4C246.1 649.2 245.4 648.9 244.8 648.7C243.8 648.3 242.9 647.8 242 647.3C241.8 647.2 241.6 647 241.4 646.9C241.1 646.7 240.9 646.6 240.7 646.4C240.4 646.2 240.2 646 240 645.8C239.8 645.7 239.7 645.6 239.6 645.4C239.6 645.4 239.6 645.4 239.6 645.4L239.6 645.4C239.6 645.5 239.4 645.1 239.3 644.9C239.2 644.8 239.2 644.6 239.2 644.5L239.1 644.5L239.1 644.4C239.1 644.3 239.1 644.2 239.1 644.2C239.2 642.9 239.1 641.7 239.1 640.4V603.4C239.3 603.6 239.5 603.7 239.7 603.8L240.8 602.2C240.3 601.8 239.9 601.5 239.5 601.1L239.1 601.3V559.2C240.8 560.3 242.6 561.2 244.5 561.9L244.6 561.9C245.9 562.4 247.2 562.9 248.5 563.3C248.6 563.3 248.6 563.3 248.7 563.4C249 563.5 249.4 563.6 249.8 563.7C255.3 565.3 260.9 566.5 266.6 567.4C266.8 567.5 267.1 567.5 267.3 567.5C268.2 567.7 269.2 567.9 270.1 568C270.8 568.1 271.6 568.2 272.3 568.4C272.4 568.4 272.5 568.4 272.6 568.4C291.2 571.2 309.9 573.1 328.7 574C347.8 575.2 367 575.8 386.2 576C386.5 576 386.8 576 387.2 576C387.5 576 387.9 576 388.3 576C405.8 576.2 423.4 576 440.9 575.5C458.1 575 475.3 574.1 492.4 572.6C493.9 572.5 495.3 572.4 496.8 572.3C496.9 572.3 496.9 572.3 497 572.2C497.2 572.2 497.4 572.2 497.6 572.2C498.7 572.1 499.9 572 501 571.9C501.7 571.8 502.4 571.8 503 571.7C503.7 571.6 504.3 571.6 505 571.5C511.8 570.8 518.6 570 525.4 569C529.6 568.4 533.8 567.8 538 567C543.6 566.1 549.2 564.7 554.7 562.9C554.8 562.9 554.9 562.9 555 562.8C555.3 562.7 555.5 562.7 555.7 562.6C558.3 561.8 560.8 560.7 563 559.2L563 573.2ZM563 475.8V513.5L561.9 512C561.4 512.3 560.8 512.7 560.3 513L561.3 514.7C561.9 514.4 562.5 514 563 513.6V543.4C563 547 563 550.7 563 554.3C563 554.4 563 554.5 563 554.7C563 554.7 563 554.8 563 554.8C563 554.8 563 554.9 563 554.9C562.9 555 562.8 555.2 562.7 555.3C562.7 555.4 562.7 555.4 562.6 555.5L562.6 555.5L562.6 555.5L562.6 555.5C562.6 555.5 562.5 555.6 562.5 555.6C562.5 555.6 562.5 555.7 562.5 555.7C562.4 555.8 562.3 555.9 562.2 556C562.1 556 562.1 556.1 562.1 556.1L562 556.1C561.8 556.3 561.5 556.5 561.3 556.7C560.8 557 560.4 557.3 560 557.5C559.1 558 558.3 558.4 557.4 558.8C557.3 558.8 557.3 558.8 557.2 558.9C557 558.9 556.9 559 556.7 559.1C556.2 559.2 555.8 559.4 555.3 559.6C551.1 561 546.7 562.2 542.3 563.1C540.3 563.5 538.4 563.9 536.5 564.2C535.3 564.4 534.1 564.7 532.9 564.9C531.5 565.1 530 565.3 528.6 565.6C520.4 566.8 512.2 567.8 504 568.6C493.4 569.7 482.8 570.5 472.2 571.1C467.1 571.4 461.9 571.7 456.8 571.9C443.1 572.5 429.4 572.9 415.7 573C415.3 573 415 573 414.7 573C410.2 573.1 405.6 573.1 401.1 573.1C387.7 573.1 374.3 572.9 360.8 572.5C360.5 572.5 360.2 572.5 359.9 572.5C359.2 572.4 358.5 572.4 357.8 572.4C344.3 571.9 330.7 571.2 317.2 570.2C315.8 570.1 314.4 570 312.9 569.9C311.1 569.8 309.4 569.6 307.6 569.5C302.4 569 297.3 568.5 292.1 568C291.3 567.9 290.4 567.8 289.6 567.7C289.3 567.7 289 567.6 288.7 567.6C287.4 567.4 286.1 567.3 284.8 567.1C284.7 567.1 284.6 567.1 284.5 567.1C283.2 566.9 281.8 566.7 280.4 566.5C277.9 566.2 275.3 565.8 272.8 565.4C270.2 565 267.6 564.6 265.1 564.1C261.1 563.4 257.1 562.5 253.2 561.5C252.6 561.3 252 561.2 251.3 561C250.5 560.7 249.7 560.5 248.8 560.2C248.6 560.2 248.3 560.1 248.1 560C247.8 559.9 247.5 559.8 247.2 559.7C247.1 559.6 246.9 559.6 246.8 559.5C246.1 559.3 245.4 559 244.8 558.8C243.8 558.4 242.9 557.9 242 557.4C241.8 557.3 241.6 557.2 241.4 557C241.1 556.8 240.9 556.7 240.7 556.5C240.4 556.4 240.2 556.1 240 555.9C239.9 555.8 239.7 555.7 239.6 555.6C239.6 555.5 239.6 555.5 239.6 555.5L239.6 555.5C239.6 555.6 239.4 555.3 239.3 555C239.2 554.9 239.2 554.7 239.2 554.6L239.2 554.6L239.1 554.5C239.1 554.4 239.1 554.3 239.1 554.3C239.2 553 239.1 551.8 239.1 550.6V513.6C239.3 513.7 239.5 513.8 239.7 513.9L240.8 512.3C240.3 512 239.9 511.6 239.5 511.2L239.1 511.5V469.3C240.3 470.1 241.5 470.7 242.8 471.3C246.1 472.8 249.7 474 253.3 474.8C256.8 475.7 260.5 476.4 264 477.1C278.7 479.8 293.4 481.7 308.3 482.7C319.5 483.7 330.7 484.3 341.9 484.8C367.2 486.1 392.6 486.4 417.9 486.1C430.8 485.9 443.6 485.6 456.5 485C475.1 484.3 493.8 483 512.4 480.8C516.4 480.4 520.5 479.8 524.5 479.3C528.9 478.7 533.3 478 537.7 477.2C537.9 477.1 538 477.1 538.2 477.1L538.2 477.1C542.5 476.3 546.8 475.4 551.1 474.2C554.4 473.4 557.6 472.3 560.6 470.8C561.5 470.4 562.3 469.9 563 469.4L563 475.8ZM839.9 549.2C839.5 549.6 839 550.1 838.5 550.5L837.1 549.1C837.6 548.6 838.1 548.2 838.6 547.7L839.9 549.2ZM837 503.2L838.3 504.7C837.8 505.2 837.3 505.6 836.8 506L835.5 504.5C836 504.1 836.5 503.6 837 503.2ZM837 551.9C836.5 552.3 836 552.8 835.5 553.2L834.2 551.7C834.7 551.3 835.2 550.8 835.7 550.4L837 551.9ZM834 505.7L835.2 507.3C834.7 507.7 834.2 508.1 833.7 508.6L832.4 507C832.9 506.6 833.5 506.2 834 505.7ZM834 554.5C833.5 555 833 555.4 832.5 555.9L831.2 554.4C831.7 553.9 832.2 553.5 832.7 553.1L834 554.5ZM830.9 508.3L832.2 509.8C831.6 510.2 831.1 510.7 830.6 511.1L829.4 509.5C829.9 509.1 830.4 508.7 830.9 508.3ZM831 557.2C830.5 557.6 830 558.1 829.5 558.5L828.2 557C828.7 556.6 829.2 556.1 829.7 555.7L831 557.2ZM827.8 510.8L829.1 512.3C828.5 512.8 828 513.2 827.5 513.6L826.3 512C826.8 511.6 827.3 511.2 827.8 510.8ZM828 559.8C827.5 560.2 827 560.7 826.5 561.1L825.2 559.6C825.7 559.1 826.2 558.7 826.7 558.3L828 559.8ZM826 514.8C825.4 515.3 824.9 515.7 824.4 516.1L823.1 514.5C823.7 514.1 824.2 513.7 824.7 513.3L826 514.8ZM761.1 602.9L762.1 604.7C761.5 605 760.9 605.3 760.3 605.6L759.4 603.9C760 603.6 760.6 603.2 761.1 602.9ZM759.3 562.2L758.2 560.5L759.9 559.5L761 561.1L759.3 562.2ZM761.6 558.4L763.3 557.3L764.3 559L762.7 560.1L761.6 558.4ZM764.6 601L765.6 602.8C765 603.1 764.4 603.4 763.8 603.7L762.9 602C763.5 601.7 764.1 601.4 764.6 601ZM764.9 556.2L766.6 555.2L767.7 556.8L766 557.9L764.9 556.2ZM768.1 599.1L769.1 600.9C768.5 601.2 767.9 601.5 767.3 601.8L766.4 600.1C767 599.8 767.5 599.4 768.1 599.1ZM768.3 554.1C768.8 553.7 769.4 553.4 770 553L771 554.7C770.5 555 769.9 555.4 769.4 555.7L768.3 554.1ZM771.6 597.2L772.6 598.9C772 599.2 771.4 599.5 770.8 599.9L769.8 598.1C770.4 597.8 771 597.5 771.6 597.2ZM771.6 551.9C772.2 551.5 772.7 551.2 773.3 550.8L774.4 552.5C773.8 552.8 773.3 553.2 772.7 553.6L771.6 551.9ZM775 595.2L776 596.9C775.4 597.2 774.9 597.5 774.3 597.9L773.3 596.2C773.9 595.8 774.4 595.5 775 595.2ZM774.9 549.7C775.5 549.3 776 549 776.6 548.6L777.7 550.2C777.1 550.6 776.6 551 776 551.4L774.9 549.7ZM778.4 593.1L779.4 594.8C778.9 595.2 778.3 595.5 777.7 595.9L776.7 594.1C777.3 593.8 777.8 593.5 778.4 593.1ZM779.4 549.1L778.2 547.5L779.9 546.4L781 548L779.4 549.1ZM781.8 591L782.9 592.7C782.3 593.1 781.7 593.4 781.2 593.8L780.1 592.1C780.7 591.7 781.2 591.4 781.8 591ZM782.7 546.9L781.5 545.2L783.2 544.1L784.3 545.8L782.7 546.9ZM785.2 588.9L786.2 590.6C785.7 591 785.1 591.3 784.5 591.7L783.5 590C784 589.6 784.6 589.3 785.2 588.9ZM785.9 544.6L784.8 543C785.4 542.6 785.9 542.2 786.4 541.9L787.6 543.5C787 543.9 786.5 544.2 785.9 544.6ZM788.5 586.8L789.6 588.5C789 588.8 788.5 589.2 787.9 589.5L786.8 587.9C787.4 587.5 788 587.1 788.5 586.8ZM789.2 542.3L788.1 540.7C788.6 540.3 789.2 540 789.7 539.6L790.9 541.2C790.3 541.6 789.8 542 789.2 542.3ZM791.8 584.6L792.9 586.3C792.4 586.6 791.8 587 791.3 587.4L790.2 585.7C790.7 585.3 791.3 585 791.8 584.6ZM792.5 540L791.3 538.4L793 537.3L794.1 538.9L792.5 540ZM795.1 582.4L796.3 584C795.7 584.4 795.2 584.8 794.6 585.1L793.5 583.5C794 583.1 794.6 582.8 795.1 582.4ZM795.7 537.7L794.6 536.1C795.1 535.7 795.7 535.3 796.2 535L797.4 536.6C796.8 537 796.3 537.3 795.7 537.7ZM798.4 580.1L799.5 581.8C799 582.1 798.5 582.5 797.9 582.9L796.8 581.3C797.3 580.9 797.9 580.5 798.4 580.1ZM799 535.4L797.8 533.8L799.4 532.6L800.6 534.2L799 535.4ZM801.7 577.8L802.8 579.5C802.3 579.8 801.7 580.2 801.2 580.6L800 579C800.6 578.6 801.1 578.2 801.7 577.8ZM802.2 533L801 531.4C801.6 531 802.1 530.7 802.6 530.3L803.8 531.9C803.3 532.3 802.7 532.7 802.2 533ZM804.9 575.5L806.1 577.1C805.5 577.5 805 577.9 804.4 578.3L803.3 576.7C803.8 576.3 804.3 575.9 804.9 575.5ZM805.4 530.7L804.2 529.1L805.8 527.9L807 529.5L805.4 530.7ZM808.1 573.1L809.3 574.7C808.7 575.1 808.2 575.5 807.7 575.9L806.5 574.3C807 573.9 807.5 573.5 808.1 573.1ZM808.6 528.3L807.4 526.7C807.9 526.3 808.5 525.9 809 525.5L810.2 527.1C809.7 527.5 809.1 527.9 808.6 528.3ZM811.2 570.8L812.5 572.3C811.9 572.7 811.4 573.1 810.9 573.5L809.7 572C810.2 571.6 810.7 571.2 811.2 570.8ZM811.8 525.9L810.6 524.3C811.1 523.9 811.6 523.5 812.2 523.1L813.4 524.7C812.8 525.1 812.3 525.5 811.8 525.9ZM814.4 568.3L815.6 569.9C815.1 570.3 814.6 570.7 814 571.1L812.8 569.5C813.3 569.1 813.9 568.7 814.4 568.3ZM815 523.5L813.7 521.9C814.3 521.5 814.8 521.1 815.3 520.7L816.5 522.2C816 522.7 815.5 523.1 815 523.5ZM817.5 565.9L818.8 567.4C818.2 567.8 817.7 568.3 817.2 568.7L816 567.1C816.5 566.7 817 566.3 817.5 565.9ZM818.1 521L816.9 519.4C817.4 519 817.9 518.6 818.5 518.2L819.7 519.8C819.2 520.2 818.6 520.6 818.1 521ZM820.6 563.4L821.9 564.9C821.4 565.3 820.8 565.8 820.3 566.2L819.1 564.6C819.6 564.2 820.1 563.8 820.6 563.4ZM821.3 518.6L820 517C820.6 516.6 821.1 516.2 821.6 515.8L822.8 517.3C822.3 517.7 821.8 518.2 821.3 518.6ZM823.7 560.8L825 562.4C824.4 562.8 823.9 563.2 823.4 563.6L822.1 562.1C822.7 561.7 823.2 561.3 823.7 560.8ZM788.5 309.3C788.5 309.2 788.5 309.1 788.5 309.3ZM794.6 218.1C800.7 227.1 799.3 239.3 793.5 248.1C790.2 253.1 785.5 256.9 779.9 259C779.6 259.1 779.3 259.3 779.1 259.5C778.9 259.8 778.8 260.1 778.8 260.4C780.8 276.9 783.1 293.3 785.2 309.7C785.5 311.7 785.7 313.7 786 315.8C786.1 316.2 786.2 316.7 786.1 317.2C786.1 317.4 786 317.6 785.9 317.8C785.8 318.2 785.6 318.5 785.5 318.8C785.2 319.5 784.9 320.1 784.6 320.8C783.9 322.2 783.2 323.6 782.5 325C782.4 325.2 782.3 325.4 782.2 325.6C781.9 326.2 781.6 326.7 781.3 327.3C781.1 327.6 780.9 327.9 780.8 328.2C780.5 328.7 780.2 329.2 779.9 329.7C779.7 330 779.5 330.4 779.2 330.8C779 331.2 778.7 331.6 778.4 332.1C778 332.8 777.5 333.5 777 334.2C776.7 334.7 776.3 335.2 776 335.7C775.8 336 775.6 336.2 775.5 336.5C775.1 337 774.7 337.6 774.2 338.2C774.2 338.3 774.1 338.4 774 338.5C772 341.2 769.9 343.7 767.7 346.2C766.4 347.6 765.1 349 763.7 350.4L763.7 350.4C763 351.1 762.4 351.7 761.8 352.4C761.7 352.4 761.6 352.5 761.5 352.6C760.9 353.2 760.3 353.8 759.7 354.3C759.5 354.5 759.4 354.6 759.3 354.7C758.7 355.2 758.1 355.8 757.5 356.3C757.4 356.4 757.2 356.6 757.1 356.7C756.5 357.2 755.9 357.7 755.3 358.2C755.1 358.4 755 358.5 754.8 358.7C754.2 359.2 753.6 359.7 753.1 360.1C752.6 360.5 752.1 360.9 751.6 361.3C751.3 361.1 750.9 360.9 750.5 360.7C750.3 360.6 750.1 360.5 749.9 360.4C749.5 360.2 749.1 360 748.7 359.8C738.9 355 729.1 350.2 720.3 343.8C719.8 338.2 719.3 332.6 718.9 326.9C720 326.8 721.2 326.7 722.3 326.5C736.3 324.6 750.1 318.2 759.3 307.2C769.1 295.5 772.4 280.1 773.3 265.1C773.7 257.3 773.6 249.5 773.5 241.7C773.4 234 773.1 226.4 772.7 218.7C773.7 214.8 777.5 212.2 781.4 211.4C786.7 210.4 791.7 213.9 794.6 218.1ZM776.7 201L777 199L777.2 199.1L777 201.1L776.7 201ZM780.8 188.4C781.4 188.5 782 188.6 782.6 188.7L782.3 190.7C781.7 190.6 781.1 190.5 780.5 190.4L780.8 188.4ZM778.6 190.2C778 190.1 777.3 190.1 776.7 190.1L776.7 188.1C777.4 188.1 778.1 188.2 778.8 188.2L778.6 190.2ZM776.2 177.6C776.9 177.8 777.6 178 778.2 178.2L777.7 180.1C777.1 179.9 776.4 179.7 775.8 179.6L776.2 177.6ZM774.8 200.9C774.3 200.8 773.7 200.8 773.1 200.8L772.9 200.8L772.9 198.8L773.1 198.8C773.7 198.8 774.3 198.8 774.9 198.9L774.8 200.9ZM774.7 190.1C774.1 190.1 773.4 190.1 772.8 190.1L772.7 188.1C773.3 188.1 774 188.1 774.7 188.1L774.7 190.1ZM772.2 177.1C772.9 177.1 773.5 177.2 774.2 177.3L773.9 179.3C773.3 179.2 772.7 179.1 772 179L772.2 177.1ZM771 200.9C770.3 200.9 769.7 201 769.1 201.1L768.8 199.1C769.5 199 770.1 198.9 770.8 198.9L771 200.9ZM770.1 177L770.1 178.9C769.4 178.9 768.8 178.9 768.1 179L768.1 177C768.8 176.9 769.4 176.9 770.1 177ZM767.2 201.4C766.5 201.5 765.9 201.7 765.3 201.8L764.8 199.9C765.4 199.7 766.1 199.6 766.8 199.4L767.2 201.4ZM766 177.1L766.2 179.1C765.6 179.1 764.9 179.2 764.2 179.2L764 177.3C764.7 177.2 765.4 177.1 766 177.1ZM765.5 188.6H765.6L765.6 190.6H765.5C764.9 190.6 764.3 190.6 763.7 190.6L763.5 188.6C764.2 188.6 764.9 188.6 765.5 188.6ZM763.4 202.4C762.8 202.6 762.2 202.8 761.6 203.1L760.9 201.2C761.5 201 762.1 200.7 762.8 200.5L763.4 202.4ZM762 177.5L762.3 179.5C761.6 179.6 761 179.7 760.3 179.8L760 177.8C760.7 177.7 761.3 177.6 762 177.5ZM761.5 188.8L761.7 190.8C761.1 190.9 760.5 191 759.8 191.1L759.5 189.2C760.1 189 760.8 188.9 761.5 188.8ZM758 178.2L758.4 180.1C757.8 180.3 757.1 180.4 756.5 180.5L756.1 178.6C756.7 178.4 757.4 178.3 758 178.2ZM757.4 189.6L757.9 191.5C757.3 191.7 756.7 191.9 756.1 192.1L755.5 190.2C756.1 190 756.8 189.8 757.4 189.6ZM754.1 179L754.5 180.9C753.9 181.1 753.2 181.2 752.6 181.4L752.2 179.4C752.8 179.3 753.5 179.1 754.1 179ZM745.4 150.9L746.8 152.3C746.4 152.7 746 153.2 745.6 153.7L744 152.5C744.5 151.9 744.9 151.4 745.4 150.9ZM742.8 154.2L744.5 155.3C744.1 155.8 743.8 156.3 743.5 156.9L741.8 156C742.1 155.4 742.4 154.8 742.8 154.2ZM740.9 157.8L742.7 158.6C742.4 159.2 742.2 159.8 742 160.4L740.1 159.8C740.3 159.1 740.6 158.5 740.9 157.8ZM667.1 207.8C667.4 208.6 667.8 209.3 668.3 209.9C668.5 210.2 668.8 210.3 669.1 210.3C669.4 210.4 669.7 210.3 670 210.2C670.2 210.3 670.5 210.4 670.7 210.4C671 210.4 671.3 210.3 671.5 210.2C675 208 679.1 206.9 683.2 207.1C684.2 207.1 685.2 207.3 686.2 207.5C687.3 207.7 688.6 208 689.7 207.3C691.4 206.2 691.5 203.9 691.5 202C691.6 200.2 691.1 198.4 690.1 196.8C688.7 194.9 686.4 194.6 684.2 194.7C681.7 194.7 679.2 195.1 676.8 195.7C674.7 196.1 672.8 196.9 671 198C669.1 199.3 667.6 201.2 667 203.4C667 203.5 667 203.6 666.9 203.7C666.8 200.9 666.7 198.1 666.7 195.3C666.8 193.5 667 191.7 667 189.9C667 188.3 666.9 186.8 666.8 185.3C666.7 183.8 666.8 182.4 667.2 181C668.6 176.8 673.7 175.2 677.6 174.2C683.9 172.4 690.2 170.8 696.5 169.1L715.8 163.9C722 162.3 728.3 160.4 734.7 159.8C735.6 159.7 736.5 159.6 737.4 159.6C739.1 160 740.8 160.4 742.5 161C742.7 171.9 746 182.5 752 191.6C752.5 191.3 753 191.1 753.5 190.9L754.3 192.7C753.9 192.9 753.5 193.1 753.1 193.2C754.2 194.8 755.4 196.3 756.7 197.7C757.9 199.1 759.2 200.5 760.6 201.7C760.8 205.8 760.9 209.9 760.9 214C756.1 214.6 751.3 215.3 746.5 215.9C746.4 213.5 745.7 211.2 744.5 209.2C743.6 208.1 742.5 207.1 741.3 206.4C740.1 205.7 738.7 205.3 737.3 205.1C736.3 205 735.3 204.9 734.3 204.9C729.9 205.1 725.4 205.5 721 206.2C717.5 206.7 713.3 207.2 710.6 209.8C709.3 211.3 708.5 213.1 708.4 215.1C708.2 216.4 708.1 217.7 708 219C706.7 219 705.5 219 704.2 219.1C703 219.1 701.8 219.3 700.6 219.7C700.4 218.1 699.8 216.6 698.9 215.3C698.1 214.2 697 213.2 695.8 212.5C694.5 211.8 693.2 211.4 691.7 211.2C690.8 211.1 689.8 211 688.8 211C684.3 211.2 679.8 211.6 675.4 212.3C672.8 212.7 669.9 213 667.4 214.2C667.3 212.1 667.2 209.9 667.1 207.8ZM743.3 222.4C743.2 224 743 225.6 742.5 227.1C742.1 228.5 741.3 229.7 740.1 230.6C738.8 231.5 737.3 232.2 735.7 232.6C732.1 233.4 728.4 233.8 724.7 233.8C721.6 233.8 718.4 233.4 715.7 231.7C713.1 230 711.7 226.9 711.2 223.9C710.9 222 710.9 220 711 218.1C711 216.3 711.3 214.6 712 213C712.7 211.7 713.9 210.8 715.3 210.4C717.2 209.8 719 209.4 720.9 209.2C725.4 208.5 729.8 208 734.3 207.9C735.8 207.8 737.3 208.1 738.8 208.5C739 208.6 739.2 208.7 739.4 208.8C739.6 208.9 739.9 209 740.1 209.2C740.3 209.3 740.5 209.4 740.7 209.6C740.8 209.6 740.9 209.7 740.9 209.7C741 209.8 741.1 209.9 741.3 210C741.4 210.2 741.6 210.4 741.8 210.6C741.8 210.6 741.8 210.6 741.8 210.6C741.8 210.6 741.8 210.6 741.8 210.7C741.9 210.8 742 210.8 742 210.9C742.1 211.1 742.3 211.3 742.4 211.5C742.4 211.6 742.5 211.7 742.5 211.8C742.5 211.9 742.6 212.1 742.6 212.1C743.2 213.6 743.5 215.2 743.5 216.8C743.5 218.7 743.5 220.6 743.3 222.4ZM667.7 217.6C668.3 217.1 669 216.8 669.8 216.5C671.6 215.9 673.5 215.5 675.4 215.3C679.8 214.6 684.3 214.1 688.8 214C690.3 213.9 691.8 214.2 693.2 214.6C693.4 214.7 693.6 214.8 693.8 214.9C694.1 215 694.3 215.1 694.6 215.3C694.8 215.4 695 215.5 695.2 215.7C695.2 215.7 695.3 215.8 695.3 215.8C695.5 215.9 695.6 216 695.7 216.1C695.9 216.3 696 216.5 696.2 216.7C696.2 216.7 696.2 216.7 696.2 216.7L696.3 216.8C696.3 216.8 696.4 216.9 696.5 217C696.6 217.2 696.7 217.4 696.8 217.6C696.9 217.7 696.9 217.8 697 217.9C697 218 697.1 218.2 697.1 218.2C697.6 219.7 697.9 221.3 698 222.9C698 224.8 697.9 226.7 697.7 228.5C697.7 230.1 697.4 231.7 697 233.2C696.5 234.6 695.7 235.8 694.6 236.7C693.2 237.6 691.7 238.3 690.1 238.7C686.5 239.5 682.8 239.9 679.1 239.9C676 239.9 672.8 239.5 670.2 237.8C669.8 237.6 669.5 237.3 669.2 237C668.6 230.6 668.1 224.1 667.7 217.6ZM677 248.2C675 248.7 673 248.8 670.9 248.7C670.5 246.1 670 243.5 669.7 240.9C671.8 242 674.2 242.6 676.5 242.8C678.4 242.9 680.2 242.9 682 242.7C684.2 242.6 686.4 242.4 688.6 242C692.4 241.4 696.5 240 698.7 236.5C699.4 235.4 699.9 234.1 700.2 232.8C700.5 236.5 700.9 240.1 701.5 243.8C693.2 242.1 685.1 246.7 677 248.2ZM704.6 244.1C703.3 236.9 702.7 229.6 702.8 222.2C702.8 222.2 702.9 222.2 702.9 222.2C702.9 222.2 703 222.2 703.1 222.2C703.2 222.2 703.4 222.2 703.5 222.1C703.9 222.1 704.2 222.1 704.5 222.1C705.7 222 706.8 222 708 222C708.1 225.8 709.5 229.6 712.1 232.5C714.7 235.3 718.4 236.4 722.1 236.7C723.9 236.8 725.7 236.8 727.5 236.7C729.8 236.5 732 236.3 734.2 235.9C738 235.3 742.1 233.9 744.3 230.4C746.3 227.2 746.3 223 746.5 219.3C746.5 219.2 746.5 219 746.5 218.9C746.5 218.9 746.5 218.9 746.6 218.9C751.3 218.2 756.1 217.6 760.9 217C760.9 218.3 760.9 219.6 760.8 220.9C760.8 224.4 760.6 227.9 760.1 231.3C759.6 234.1 758.7 237.1 756.8 239.3C752 244.6 744.1 242.4 738.1 241.2C734.2 240.3 730.2 239.9 726.2 239.9C722.1 240 718.1 240.5 714.2 241.4C710.9 242.2 707.7 243.1 704.6 244.3C704.6 244.2 704.6 244.2 704.6 244.1ZM708.2 269.6C707.8 269.7 707.4 269.7 707 269.5C706.7 269.3 706.4 269 706.3 268.6C706.2 268.2 706.3 267.8 706.5 267.5C706.7 267.1 707 266.9 707.4 266.8C712.7 266 717.7 263.6 721.7 260C721.8 259.8 722 259.7 722.2 259.7C722.3 259.6 722.5 259.5 722.7 259.5C722.9 259.5 723.1 259.6 723.3 259.7C723.5 259.7 723.6 259.8 723.8 260C723.9 260.1 724 260.3 724.1 260.5C724.2 260.6 724.2 260.8 724.2 261C724.2 261.2 724.2 261.4 724.1 261.6C724 261.8 723.9 262 723.8 262.1C719.4 266.1 714 268.7 708.2 269.6ZM692.7 342.4C693.9 340.7 695.4 339.2 697.1 338.1C698.9 336.9 700.6 335.6 702.4 334.4C706.1 331.9 710 329.4 714.3 328C714.7 327.9 715.1 327.7 715.5 327.6C716 332 716.4 336.4 716.8 340.8C716.5 340.7 716.2 340.7 715.9 340.7C715.6 340.7 715.3 340.8 715.1 341C714.8 341.1 714.6 341.4 714.5 341.6C714.4 341.9 714.4 342.2 714.4 342.5C714.5 342.8 714.6 343 714.8 343.3C715.7 344 716.7 344.7 717.6 345.5C717.7 345.5 717.7 345.6 717.8 345.6C717.9 345.7 718 345.7 718.1 345.8C718.3 346 718.6 346.2 718.9 346.4C719 346.5 719.1 346.5 719.2 346.6C719.4 346.8 719.7 347 720 347.2C720.4 347.5 720.8 347.8 721.1 348C721.3 348.1 721.4 348.2 721.5 348.2C722.6 349 723.6 349.7 724.8 350.4C724.9 350.5 725 350.5 725.1 350.6C725.8 351.1 726.6 351.5 727.3 352C727.6 352.1 727.8 352.2 728 352.4C728.9 352.9 729.7 353.4 730.6 353.8C730.7 353.9 730.9 354 731.1 354.1C734.9 356.3 738.9 358.3 742.8 360.2C743.2 360.4 743.5 360.6 743.8 360.7C744.6 361.1 745.4 361.5 746.2 361.9C747.8 362.7 749.4 363.5 751 364.3L751.1 364.3C751.1 364.3 751.1 364.3 751.1 364.3C751.4 364.5 751.6 364.5 751.9 364.5H751.9C751.9 364.5 752 364.5 752 364.5C752 364.5 752 364.5 752.1 364.5C752.4 364.4 752.6 364.3 752.9 364.1C752.9 364.1 752.9 364.1 752.9 364.1L752.9 364.1C752.9 364.1 752.9 364.1 753 364C753.7 363.5 754.4 362.9 755 362.4C755.5 362 755.9 361.6 756.3 361.3C756.6 361.1 756.8 360.8 757.1 360.6C757.6 360.2 758.2 359.7 758.7 359.2C758.8 359.1 758.9 359 759 359C763.2 355.3 767.2 351.3 770.9 347.1C771.7 346.1 772.6 345.1 773.4 344.1C773.4 344.1 773.4 344 773.5 344C774.4 342.9 775.2 341.8 776 340.8C776.2 340.5 776.4 340.2 776.6 340C776.8 339.7 777.1 339.3 777.3 339C777.6 338.5 778 338.1 778.3 337.6C778.5 337.3 778.8 337 779 336.6C779.3 336.2 779.6 335.7 780 335.2C780.2 334.9 780.4 334.5 780.6 334.2C780.7 334 780.9 333.8 781 333.5C781.2 333.3 781.3 333 781.5 332.8C781.7 332.4 782 332 782.2 331.7C782.4 331.2 782.7 330.8 783 330.4C783.2 330 783.4 329.6 783.7 329.1C783.9 328.8 784.1 328.4 784.3 328C784.5 327.6 784.8 327.1 785 326.7C785.2 326.2 785.5 325.8 785.7 325.3C785.9 325 786 324.7 786.2 324.4C786.2 324.4 786.2 324.3 786.2 324.3C786.5 323.8 786.7 323.3 786.9 322.8C787.1 322.5 787.3 322.1 787.4 321.8C787.5 321.6 787.6 321.4 787.7 321.2C787.8 320.9 787.9 320.6 788.1 320.3C788.2 320.1 788.3 319.9 788.3 319.7C788.6 319.2 788.8 318.7 789 318.2C789 318.2 789 318.1 789 318.1C789.3 317.6 789.5 316.9 789.5 316.3C789.4 315 789.2 313.8 788.9 312.6C788.8 311.9 788.7 311.3 788.6 310.7C788.6 310.6 788.6 310.6 788.6 310.5C789.6 311.1 790.6 311.8 791.6 312.6C792 312.9 792.4 313.2 793 313.7C793.4 314 793.8 314.3 794.2 314.7C795.6 316.1 796.9 317.6 798.1 319.1C804 326.1 808.6 334 814.3 341.1C815.1 342 815.8 342.9 816.6 343.8L816.6 343.8L816.6 343.8C817.4 344.7 818.2 345.6 819.1 346.5C819.6 347.1 820.1 347.6 820.6 348.2C822.3 350.1 823.4 352.4 823.6 354.9C823.7 355.2 823.7 355.4 823.7 355.7V355.7C823.7 355.9 823.6 356.2 823.6 356.4C823.6 356.5 823.6 356.7 823.6 356.9L823.6 357C823.2 359.3 822.5 361.6 821.4 363.7C821.2 364.1 821 364.6 820.8 365C820.4 365.7 820 366.5 819.6 367.2C818.1 369.9 816.5 372.7 814.8 375.4C814.8 375.4 814.7 375.5 814.7 375.5C812.3 379.3 809.8 383.1 807.1 386.7C801.8 393.9 796 400.7 789.7 407C789.1 407.6 788.5 408.2 787.9 408.8C787.6 409 787.4 409.3 787.2 409.5C786.8 409.8 786.5 410.1 786.1 410.4C785.9 410.5 785.8 410.6 785.6 410.7C784.4 411.2 783.6 410.6 782.8 409.8C782.5 409.6 782.2 409.3 782 409.1C781.6 408.7 781.3 408.2 781.1 407.9C779.9 406.5 778.7 405 777.5 403.5C777.1 403.1 776.7 402.6 776.3 402.1C776 401.7 775.7 401.3 775.4 400.9C775 400.4 774.6 399.8 774.2 399.3C773.9 398.9 773.6 398.5 773.2 398.1C772.9 397.6 772.5 397.1 772.1 396.6C771.7 396.1 771.4 395.6 771 395.1C770.7 394.7 770.3 394.2 770 393.8C769.7 393.4 769.5 393 769.2 392.6C768.7 392 768.2 391.3 767.8 390.7C767.5 390.4 767.3 390 767.1 389.7C766.5 389 766 388.2 765.5 387.5C765.3 387.2 765.2 387 765 386.7C764.4 385.9 763.8 385 763.3 384.2C763.2 384 763.1 383.9 763 383.7C762.3 382.8 761.6 381.8 761 380.8L760.9 380.7C758.1 376.3 755.4 371.9 752.8 367.4C752.8 367.4 752.8 367.4 752.7 367.4C752.6 367.2 752.4 367 752.2 366.9C752 366.8 751.8 366.7 751.6 366.7C751.3 366.7 751 366.8 750.7 366.9C750.6 367 750.5 367.1 750.5 367.1L726.4 388.9L720.4 394.3C719.6 395 718.9 395.6 718.2 396.3C717.5 397 716.7 397.6 716 398.3C715.9 398.4 715.7 398.5 715.6 398.6C715.3 398.8 715 399.1 714.8 399.3C713.2 400.6 711.4 401.5 709.4 402.1C709 402.2 708.5 402.2 708 402.2C707.9 402.2 707.8 402.2 707.7 402.2C707.1 402.1 706.6 401.9 706.1 401.5C705.6 401.2 705.2 400.8 704.9 400.3C704.9 400.2 704.9 400.2 704.9 400.2C704.8 400.2 704.8 400.1 704.8 400.1C704.5 399.4 704.2 398.7 704 398C703.6 396.8 703.3 395.7 703 394.5C702.3 392.2 701.7 389.9 701.1 387.5C700.9 386.9 700.7 386.2 700.5 385.6C700 383.8 699.6 382 699.1 380.2C699 379.6 698.8 379.1 698.6 378.5C698.1 376.2 697.5 373.9 696.9 371.6C696.7 371 696.6 370.4 696.5 369.8C696 368.1 695.6 366.3 695.1 364.5C695 363.7 694.8 362.9 694.6 362C694.1 360 693.6 357.9 693.1 355.9C692.8 354.6 692.5 353.2 692.2 351.9C691.8 350.2 691.6 348.5 691.6 346.9C691.6 346.8 691.6 346.7 691.6 346.6C691.6 345.1 692 343.7 692.7 342.4ZM757.6 563.3L755.9 564.3L754.9 562.6L756.5 561.6L757.6 563.3ZM754.2 565.4L752.5 566.4L751.5 564.7L753.2 563.7L754.2 565.4ZM744 571.6C743.4 571.9 742.8 572.2 742.2 572.6L741.9 572C741.7 572.1 741.4 572.1 741.1 572.1C740.8 572.1 740.5 572 740.1 571.9C739.7 571.8 739.4 571.5 739 571.2C738.5 570.8 738.1 570.2 737.9 569.6C737.8 569.3 737.7 568.9 737.7 568.6C737.7 568.3 737.8 567.9 737.9 567.6C737.9 567.5 738 567.5 738 567.4C738 567.3 738.1 567.2 738.1 567.1C738.3 566.8 738.5 566.5 738.7 566.3C739 566.1 739.3 565.9 739.6 565.7C739.8 565.6 740 565.6 740.2 565.5C740.4 565.4 740.6 565.4 740.9 565.4C741.2 565.4 741.5 565.4 741.9 565.4C742.5 565.6 743.1 565.8 743.5 566.3C743.7 566.5 743.9 566.7 744.1 567C744.2 567.3 744.3 567.6 744.4 567.9C744.5 568.5 744.5 569.2 744.3 569.8C744.2 570.1 744 570.4 743.8 570.6C743.8 570.7 743.7 570.8 743.6 570.9L744 571.6ZM736.9 607.2C736.9 607.1 737 607.1 737 607C737 606.9 737.1 606.8 737.1 606.7C737.3 606.4 737.5 606.1 737.7 605.9C738 605.7 738.2 605.5 738.5 605.4C738.7 605.3 739 605.2 739.2 605.1C739.4 605.1 739.6 605 739.8 605C740.2 605 740.5 605 740.9 605.1C741.5 605.2 742 605.5 742.5 605.9C742.7 606.1 742.9 606.3 743.1 606.6C743.2 606.9 743.3 607.2 743.4 607.5C743.5 608.1 743.5 608.8 743.2 609.4C743 610 742.6 610.6 742.1 611C741.5 611.5 740.8 611.7 740.1 611.7C739.8 611.7 739.4 611.6 739.1 611.5C738.7 611.4 738.3 611.2 738 610.9C737.5 610.4 737.1 609.9 736.9 609.2C736.8 608.9 736.7 608.6 736.7 608.2C736.7 607.9 736.8 607.5 736.9 607.2ZM735.3 576.6L734.4 574.9C734.9 574.5 735.5 574.2 736.1 573.9L737.1 575.6C736.5 575.9 735.9 576.3 735.3 576.6ZM737.8 572.9C738.4 572.5 738.9 572.2 739.5 571.9L740.5 573.6C740 573.9 739.4 574.3 738.8 574.6L737.8 572.9ZM744.1 531.8C743.5 532.2 742.9 532.5 742.2 532.5C741.8 532.5 741.5 532.4 741.2 532.3C740.7 532.1 740.4 531.9 740 531.6C739.5 531.2 739.1 530.6 738.9 530C738.8 529.7 738.8 529.3 738.8 529C738.8 528.6 738.8 528.3 738.9 528C738.9 527.9 739 527.8 739 527.8C739 527.7 739.1 527.6 739.1 527.5C739.3 527.2 739.5 526.9 739.8 526.7C740 526.4 740.3 526.3 740.6 526.1C740.8 526 741 525.9 741.2 525.9C741.4 525.8 741.6 525.8 741.9 525.8C742.2 525.7 742.6 525.8 742.9 525.8C743.5 525.9 744.1 526.2 744.5 526.6C744.8 526.9 745 527.1 745.1 527.4C745.3 527.7 745.4 528 745.4 528.3C745.6 528.9 745.5 529.6 745.3 530.2C745.1 530.8 744.6 531.4 744.1 531.8ZM739.8 489.4C739.8 489 739.8 488.7 739.9 488.4C740 488.3 740 488.2 740 488.1C740.1 488 740.1 487.9 740.1 487.9C740.3 487.6 740.5 487.3 740.8 487C741 486.8 741.3 486.6 741.6 486.5C741.8 486.4 742 486.3 742.2 486.3C742.4 486.2 742.7 486.2 742.9 486.1C743.2 486.1 743.6 486.1 743.9 486.2C744.5 486.3 745.1 486.6 745.5 487C745.8 487.2 746 487.5 746.1 487.8C746.3 488 746.4 488.3 746.4 488.6C746.6 489.3 746.5 489.9 746.3 490.5C746.1 491.2 745.7 491.8 745.1 492.2C744.6 492.6 743.9 492.9 743.2 492.9C742.8 492.8 742.5 492.8 742.2 492.7C741.8 492.5 741.4 492.3 741 492C740.5 491.6 740.1 491 739.9 490.4C739.8 490 739.8 489.7 739.8 489.4ZM746.4 567.8L747.4 569.5C746.8 569.9 746.2 570.2 745.7 570.5L744.7 568.8C745.2 568.5 745.8 568.1 746.4 567.8ZM747.3 450.9C747.1 451.6 746.7 452.1 746.1 452.6C745.6 453 744.9 453.2 744.2 453.2C743.8 453.2 743.5 453.2 743.2 453.1C742.8 452.9 742.4 452.7 742.1 452.4C741.5 452 741.2 451.4 741 450.7C740.8 450.4 740.8 450.1 740.8 449.7C740.8 449.4 740.8 449.1 740.9 448.7C741 448.7 741 448.6 741 448.5C741.1 448.4 741.1 448.3 741.2 448.2C741.3 447.9 741.5 447.7 741.8 447.4C742 447.2 742.3 447 742.6 446.9C742.8 446.8 743 446.7 743.2 446.6C743.4 446.6 743.7 446.5 743.9 446.5C744.2 446.5 744.6 446.5 744.9 446.6C745.5 446.7 746.1 447 746.6 447.4C746.8 447.6 747 447.9 747.1 448.1C747.3 448.4 747.4 448.7 747.5 449C747.6 449.7 747.5 450.3 747.3 450.9ZM747.1 412.9C746.6 413.4 745.9 413.6 745.2 413.6C744.9 413.6 744.5 413.5 744.2 413.4C743.8 413.3 743.4 413.1 743.1 412.8C742.6 412.3 742.2 411.8 742 411.1C741.9 410.8 741.8 410.5 741.8 410.1C741.8 409.8 741.9 409.4 742 409.1C742 409 742 409 742.1 408.9C742.1 408.8 742.1 408.7 742.2 408.6C742.3 408.3 742.5 408 742.8 407.8C743 407.6 743.3 407.4 743.6 407.3C743.8 407.2 744 407.1 744.2 407C744.5 407 744.7 406.9 744.9 406.9C745.3 406.9 745.6 406.9 745.9 407C746.6 407.1 747.1 407.4 747.6 407.8C747.8 408 748 408.2 748.1 408.5C748.3 408.8 748.4 409.1 748.5 409.4C748.6 410 748.5 410.7 748.3 411.3C748.1 411.9 747.7 412.5 747.1 412.9ZM749.8 565.7L750.8 567.4L749.1 568.5L748.1 566.8L749.8 565.7ZM733.6 577.6C733 577.9 732.5 578.2 731.9 578.6L730.9 576.8C731.5 576.5 732.1 576.2 732.6 575.9L733.6 577.6ZM730.1 579.6C729.6 579.9 729 580.2 728.4 580.5L727.4 578.8C728 578.5 728.6 578.1 729.2 577.8L730.1 579.6ZM726.7 581.5C726.1 581.8 725.5 582.1 724.9 582.5L724 580.7C724.5 580.4 725.1 580.1 725.7 579.8L726.7 581.5ZM723.2 583.4C722.6 583.8 722 584.1 721.4 584.4L720.5 582.6C721 582.3 721.6 582 722.2 581.7L723.2 583.4ZM719.7 585.3C719.1 585.7 718.5 586 717.9 586.3L717 584.5C717.6 584.2 718.1 583.9 718.7 583.6L719.7 585.3ZM716.2 587.2C715.6 587.5 715 587.9 714.4 588.2L713.5 586.4C714 586.1 714.6 585.8 715.2 585.5L716.2 587.2ZM712.6 589.1L710.9 590L709.9 588.3L711.7 587.3L712.6 589.1ZM709.1 591C708.5 591.3 707.9 591.6 707.3 591.9L706.4 590.1C707 589.8 707.6 589.5 708.2 589.2L709.1 591ZM705.6 592.8C705 593.1 704.4 593.4 703.8 593.7L702.9 591.9C703.5 591.6 704.1 591.3 704.6 591L705.6 592.8ZM702 594.6C701.4 594.9 700.8 595.2 700.2 595.5L699.3 593.7C699.9 593.4 700.5 593.1 701.1 592.8L702 594.6ZM698.4 596.4C697.8 596.7 697.2 597 696.6 597.3L695.8 595.5C696.4 595.2 696.9 594.9 697.5 594.6L698.4 596.4ZM694.9 598.2C694.3 598.5 693.7 598.8 693.1 599.1L692.2 597.3C692.8 597 693.4 596.7 694 596.4L694.9 598.2ZM690.4 598.1L691.3 599.9C690.7 600.2 690.1 600.5 689.5 600.8L688.6 599C689.2 598.7 689.8 598.4 690.4 598.1ZM686.8 599.9L687.7 601.7L685.9 602.5L685 600.7L686.8 599.9ZM683.2 601.6L684.1 603.4C683.5 603.7 682.9 603.9 682.3 604.2L681.4 602.4C682 602.1 682.6 601.9 683.2 601.6ZM679.6 603.3L680.5 605.1C679.9 605.3 679.3 605.6 678.6 605.9L677.8 604.1C678.4 603.8 679 603.5 679.6 603.3ZM676 604.9L676.8 606.7C676.2 607 675.6 607.3 675 607.6L674.2 605.8C674.8 605.5 675.4 605.2 676 604.9ZM672.4 606.6L673.2 608.4C672.6 608.7 672 608.9 671.4 609.2L670.6 607.4C671.2 607.1 671.8 606.9 672.4 606.6ZM668.8 608.2L669.6 610C669 610.3 668.3 610.6 667.7 610.8L666.9 609C667.5 608.7 668.1 608.5 668.8 608.2ZM665.1 609.8L665.9 611.6C665.3 611.9 664.7 612.2 664.1 612.4L663.3 610.6C663.9 610.3 664.5 610.1 665.1 609.8ZM661.5 611.4L662.2 613.2L660.4 614L659.6 612.2L661.5 611.4ZM657.8 613L658.6 614.8L656.7 615.6L656 613.7L657.8 613ZM566 641.2V576.5C572.4 570.5 578.7 564.3 584.9 558.1C584.9 557.8 584.9 557.6 584.8 557.3C584.1 547.4 583.5 537.5 583.3 527.6C583 517.6 582.9 507.7 583.1 497.8C583.3 487.8 583.7 477.9 584.4 468C585 458.1 585.9 448.2 587 438.3C587 437.9 587.2 437.6 587.5 437.3C587.7 437 588.1 436.8 588.5 436.8C588.9 436.8 589.3 437 589.6 437.3C589.8 437.6 590 437.9 590 438.3C589.9 439.6 589.7 440.8 589.6 442C588.5 451.9 587.7 461.9 587.1 471.8C586.5 481.8 586.1 491.8 586 501.8C585.9 511.7 586 521.6 586.4 531.6C586.7 541.5 587.3 551.5 588.1 561.4C588.6 566.1 588.9 570.8 588.9 575.5C589 575.9 589 576.2 589.1 576.6C590 580.3 591.3 584.3 590.5 588.2C589.9 591.5 587.6 594.1 586.1 597C583.5 602.3 584.2 608.2 587 613.3C589.8 618.3 594.3 622.2 599.6 624.4C598.7 626.4 598.2 628.6 597.5 630.6C595.6 636.5 593.8 642.4 592.2 648.3C588.9 660.3 586.1 672.5 583.7 684.8C583.2 687.4 582.7 690 582.2 692.6H581.9C576.7 692.6 571.2 692 566 692.5V644.4C566 644.3 566 644.1 566 644C566.1 643.1 566 642.2 566 641.2ZM946.6 695.6H975.3C980.7 695.6 986.4 696.1 991.8 695.6C1006.2 723.1 1020.6 750.6 1035 778.2L1040 787.7H566V734.7C566.5 732.4 566 729.6 566 727.5V695.6H945.3C945.5 695.6 945.7 695.7 945.9 695.7C946.2 695.7 946.4 695.6 946.6 695.6ZM941.8 672.9C942.8 679.5 943.6 686 944.2 692.6H920.8L920.5 691.1L918.5 691.5L918.7 692.6H599.8C599.9 692.5 599.9 692.4 599.9 692.3L598 691.8C597.9 692.1 597.9 692.3 597.8 692.6H585.3C587.4 681.2 589.8 669.9 592.6 658.8C594.1 652.7 595.7 646.7 597.5 640.8C597.5 640.7 597.6 640.5 597.6 640.4C597.9 640.5 598.2 640.5 598.5 640.6L598.9 638.6C598.7 638.6 598.4 638.5 598.2 638.5C598.8 636.3 599.5 634.2 600.2 632C600.8 629.8 601.5 627.6 602.3 625.5C608.5 627.7 615.2 628.6 621.7 629.5C629.5 630.6 637.3 631.4 645.1 632.2C675.9 635 706.9 636.1 737.8 637C767 637.9 796.3 637.7 825.4 634.6C853.9 631.4 882.3 625.3 908.9 614.2C914.2 612.2 919.2 609.6 924 606.5C931.9 628.1 938.2 650.2 941.8 672.9ZM999 397.5C994.2 392.4 990 386.7 986.6 380.6C985.6 378.9 988.2 377.4 989.2 379.1C992.5 385 996.5 390.4 1001.1 395.4C1002.4 396.8 1000.3 398.9 999 397.5Z" fill="currentColor"/>
    </svg>
  )
}
