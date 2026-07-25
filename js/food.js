// ---------- food registry: hand-held props used by the 'eat' action ----------
// Scene-wide, like Furniture — pick what food shows up whenever any character's action is 'eat'.
// To add a new food item: add one entry here (its draw(hand) renders at the character's hand
// position) and it automatically appears in the Food dropdown via FOOD_LIST.
const FOODS = {
  sandwich: {
    label: 'Sandwich',
    draw: (hand)=>{
      ctx.save();
      ctx.fillStyle = '#e8c07d'; ctx.strokeStyle = '#a97c3f'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(hand.x-8, hand.y+3); ctx.lineTo(hand.x+8, hand.y+3); ctx.lineTo(hand.x+6, hand.y-5); ctx.lineTo(hand.x-6, hand.y-5); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#8fce6a'; ctx.fillRect(hand.x-7, hand.y-1, 14, 2);
      ctx.restore();
    }
  },
  apple: {
    label: 'Apple',
    draw: (hand)=>{
      ctx.save();
      ctx.fillStyle = '#e0453f'; ctx.strokeStyle = '#a12e29'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(hand.x, hand.y, 6, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#5a3d24'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(hand.x, hand.y-6); ctx.lineTo(hand.x+1, hand.y-11); ctx.stroke();
      ctx.restore();
    }
  },
  pizza: {
    label: 'Pizza Slice',
    draw: (hand)=>{
      ctx.save();
      ctx.fillStyle = '#f2c879'; ctx.strokeStyle = '#c98a3a'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(hand.x-8, hand.y+5); ctx.lineTo(hand.x+8, hand.y+5); ctx.lineTo(hand.x, hand.y-9); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#d1453b';
      [[-3,2],[2,0],[-1,-3]].forEach(o=>{ ctx.beginPath(); ctx.arc(hand.x+o[0], hand.y+o[1], 1.3, 0, Math.PI*2); ctx.fill(); });
      ctx.restore();
    }
  },
  burger: {
    label: 'Burger',
    draw: (hand)=>{
      ctx.save();
      ctx.fillStyle = '#e0a94c'; ctx.strokeStyle = '#a97c3f'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(hand.x, hand.y-3, 7, Math.PI, 0); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#6b8f3d'; ctx.fillRect(hand.x-7, hand.y-2, 14, 2.5); ctx.strokeRect(hand.x-7, hand.y-2, 14, 2.5);
      ctx.fillStyle = '#7a4a28'; ctx.fillRect(hand.x-7, hand.y, 14, 3); ctx.strokeRect(hand.x-7, hand.y, 14, 3);
      ctx.fillStyle = '#e0a94c'; ctx.fillRect(hand.x-7, hand.y+3, 14, 4); ctx.strokeRect(hand.x-7, hand.y+3, 14, 4);
      ctx.restore();
    }
  },
  hotdog: {
    label: 'Hot Dog',
    draw: (hand)=>{
      ctx.save();
      ctx.fillStyle = '#e0c07d'; ctx.strokeStyle = '#a97c3f'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(hand.x, hand.y, 11, 4.5, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#a0522d';
      ctx.beginPath(); ctx.ellipse(hand.x, hand.y, 8, 2.6, 0, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#f2c94c'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(hand.x-7,hand.y-1); ctx.lineTo(hand.x+7,hand.y+1); ctx.stroke();
      ctx.restore();
    }
  },
  icecream: {
    label: 'Ice Cream',
    draw: (hand)=>{
      ctx.save();
      ctx.fillStyle = '#f9a8d4'; ctx.strokeStyle = '#c2185b'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(hand.x, hand.y-6, 6, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e2b98f'; ctx.strokeStyle = '#a97c3f';
      ctx.beginPath(); ctx.moveTo(hand.x-5, hand.y-2); ctx.lineTo(hand.x+5, hand.y-2); ctx.lineTo(hand.x, hand.y+10); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  },
  cake: {
    label: 'Slice of Cake',
    draw: (hand)=>{
      ctx.save();
      ctx.fillStyle = '#fbcfe8'; ctx.strokeStyle = '#be185d'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(hand.x-8, hand.y+6); ctx.lineTo(hand.x+8, hand.y+6); ctx.lineTo(hand.x, hand.y-8); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.moveTo(hand.x-6, hand.y+2); ctx.lineTo(hand.x+6, hand.y+2); ctx.lineTo(hand.x, hand.y-6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e0453f';
      ctx.beginPath(); ctx.arc(hand.x, hand.y-9, 1.6, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
  },
  donut: {
    label: 'Donut',
    draw: (hand)=>{
      ctx.save();
      ctx.fillStyle = '#f2c879'; ctx.strokeStyle = '#c98a3a'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(hand.x, hand.y, 7, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(hand.x, hand.y, 2.5, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#f472b6';
      [[-3,-2],[2,-4],[4,1],[-2,3]].forEach(o=>{ ctx.beginPath(); ctx.arc(hand.x+o[0], hand.y+o[1], 1, 0, Math.PI*2); ctx.fill(); });
      ctx.restore();
    }
  }
};
const FOOD_LIST = Object.keys(FOODS).map(id => ({ id, label: FOODS[id].label }));
function drawFoodProp(hand, foodId){
  const entry = FOODS[foodId] || FOODS.sandwich;
  entry.draw(hand);
}
