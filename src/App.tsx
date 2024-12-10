import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

const InsuranceComparison = () => {
  // Key parameters
  const startYear = 2024;
  const currentAge = 41;
  const viktorLifeExpectancy = 81;
  const gannaLifeExpectancy = 88;

  // Children
  const child1CurrentAge = 19; // Leaves at 25 => 6 years from now
  const child2CurrentAge = 16; // Leaves at 25 => 9 years from now
  const child1LeaveYear = startYear + (25 - child1CurrentAge); // 2030
  const child2LeaveYear = startYear + (25 - child2CurrentAge); // 2033

  // GBZ logic
  const gbzStopPayAge = 60; 
  const gbzStabilizeAge = 67; 

  // Calculate event years
  const gbzEndYear = startYear + (gbzStopPayAge - currentAge);  // Year turning 61
  const gbzStabilizeYear = startYear + (gbzStabilizeAge - currentAge);
  const viktorEndYear = startYear + (viktorLifeExpectancy - currentAge);
  const gannaEndYear = startYear + (gannaLifeExpectancy - currentAge);

  // Initial adult base premium at age 41 (no Kurkosten, includes GBZ)
  // Given: Adult total at 41 = 748.40€ with GBZ (1.1 factor)
  // base = 748.40 / 1.1 ≈ 680.36€
  const initialBasePremium = 680.36;

  // Growth rates
  const adultIncrease = 0.02; // 2% per year for base premium
  const childIncrease = 0.03; // children at 3%
  const gkvIncrease = 0.03;   // GKV at 3%

  // Child premium (no GBZ)
  const childPremium = 223.75;

  // GKV initial
  const gkvBase = 2200.00; 

  // Deductible
  const deductiblePerPerson = 800;

  const totalYears = gannaLifeExpectancy - currentAge; // until Ganna ends

  const calculateProjection = () => {
    const data = [];

    for (let i = 0; i <= totalYears; i++) {
      const year = startYear + i;
      const age = currentAge + i;

      // Who is covered?
      const viktorCovered = age <= viktorLifeExpectancy;
      const gannaCovered = age <= gannaLifeExpectancy;
      const child1Covered = year < child1LeaveYear; 
      const child2Covered = year < child2LeaveYear;

      // Calculate adult base premium for this age:
      const yearsFrom41 = age - 41;
      const currentBasePremium = initialBasePremium * Math.pow(1 + adultIncrease, yearsFrom41);

      // Apply GBZ logic:
      let currentViktorPKV = 0;
      let currentGannaPKV = 0;

      if (viktorCovered) {
        if (age <= 60) {
          // Ages 41-60: base * 1.1
          currentViktorPKV = currentBasePremium * 1.1;
        } else if (age <= 66) {
          // Ages 61-66: base only
          currentViktorPKV = currentBasePremium;
        } else {
          // Age >= 67: base - 94.42
          const discounted = currentBasePremium - 94.42;
          currentViktorPKV = discounted > 0 ? discounted : 0;
        }
      }

      if (gannaCovered) {
        if (age <= 60) {
          currentGannaPKV = currentBasePremium * 1.1;
        } else if (age <= 66) {
          currentGannaPKV = currentBasePremium;
        } else {
          const discounted = currentBasePremium - 94.42;
          currentGannaPKV = discounted > 0 ? discounted : 0;
        }
      }

      // Children premiums
      const childMultiplier = Math.pow(1 + childIncrease, i);
      const currentChild1PKV = child1Covered ? (childPremium * childMultiplier) : 0;
      const currentChild2PKV = child2Covered ? (childPremium * childMultiplier) : 0;

      // GKV logic (3% growth, halved after Viktor ends)
      const gkvMultiplier = Math.pow(1 + gkvIncrease, i);
      const gkvFactor = viktorCovered ? 1 : 0.5;
      const currentGKV = gkvBase * gkvMultiplier * gkvFactor;

      // Deductibles
      let membersWithDeductible = 0;
      if (viktorCovered) membersWithDeductible++;
      if (gannaCovered) membersWithDeductible++;
      if (child1Covered) membersWithDeductible++;
      if (child2Covered) membersWithDeductible++;
      const annualDeductible = membersWithDeductible * deductiblePerPerson;
      const monthlyDeductible = annualDeductible / 12;

      // Total monthly PKV
      const totalMonthlyPKV = currentViktorPKV + currentGannaPKV + currentChild1PKV + currentChild2PKV + monthlyDeductible;

      // Annual costs
      const annualPKV = Math.round(totalMonthlyPKV * 12);
      const annualGKV = Math.round(currentGKV * 12);

      // Calculate monthly GBZ while age <= 60:
      let monthlyGBZ = 0;
      if (age <= 60) {
        let adultsCount = 0;
        if (viktorCovered) adultsCount++;
        if (gannaCovered) adultsCount++;
        monthlyGBZ = (currentBasePremium * 0.1) * adultsCount;
      }

      // Cumulative
      const prev = data[data.length - 1] || { 
        cumulativePKV: 0, 
        cumulativeGKV: 0,
        cumulativeGBZ: 0 
      };
      const cumulativePKV = prev.cumulativePKV + annualPKV;
      const cumulativeGKV = prev.cumulativeGKV + annualGKV;
      const cumulativeGBZ = prev.cumulativeGBZ + Math.round(monthlyGBZ * 12);

      // Comments for events
      let comment = '';
      if (year === child1LeaveYear) comment = 'Child 1 leaves';
      if (year === child2LeaveYear) comment = 'Child 2 leaves';
      if (year === gbzEndYear) comment = 'GBZ ends (age 61)';
      if (year === gbzStabilizeYear) comment = 'GBZ stabilization (age 67)';
      if (year === viktorEndYear) comment = 'Viktor ends (age 81)';
      if (year === gannaEndYear) comment = 'Ganna ends (age 88)';

      data.push({
        year,
        age,
        monthlyPKV: Math.round(totalMonthlyPKV),
        monthlyGKV: Math.round(currentGKV),
        monthlyGBZ: Math.round(monthlyGBZ),
        cumulativeGBZ,
        PKV: annualPKV,
        GKV: annualGKV,
        cumulativePKV,
        cumulativeGKV,
        difference: cumulativeGKV - cumulativePKV,
        viktorBasePremium: Math.round(currentBasePremium),
        gannaBasePremium: Math.round(currentBasePremium),
        child1Premium: Math.round(currentChild1PKV),
        child2Premium: Math.round(currentChild2PKV),
        deductible: Math.round(monthlyDeductible),
        coveredMembers: membersWithDeductible,
        comment
      });
    }

    return data;
  };

  const data = calculateProjection();
  const finalYear = data[data.length - 1];
  const firstYear = data[0];

  return (
    <div className="w-full p-4">
      <div className="mb-4">
        <h2 className="text-lg font-bold">PKV vs GKV Cost Comparison (Real GBZ Lifecycle)</h2>
        <p className="text-sm text-gray-600 mb-2">
          Ages 41–60: base premium +10% GBZ, +2% growth/year<br/>
          Ages 61–66: base premium only (+2%/year, no GBZ)<br/>
          Age 67+: base premium (+2%/year) - 94.42€ stabilization<br/>
          Children: 3% growth, leave at 25<br/>
          GKV: 3% growth, halved after Viktor ends
        </p>
        <div className="mt-4 p-4 bg-blue-50 rounded">
          <h3 className="font-bold mb-2">Lifetime Summary:</h3>
          <ul className="text-sm">
            <li>Initial Monthly PKV: {firstYear.monthlyPKV}€</li>
            <li>Initial Monthly GKV: {firstYear.monthlyGKV}€</li>
            <li>Total PKV: {(finalYear.cumulativePKV / 1000).toFixed(0)}k€</li>
            <li>Total GKV: {(finalYear.cumulativeGKV / 1000).toFixed(0)}k€</li>
            <li>Difference (GKV - PKV): {(finalYear.difference / 1000).toFixed(0)}k€</li>
          </ul>
        </div>
      </div>
      <div className="h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis />
            <Tooltip 
              formatter={(value, name) => [`${value.toLocaleString()}€`, name]}
              labelFormatter={(yearLabel) => {
                const datum = data.find(d => d.year === +yearLabel);
                return `Year: ${yearLabel} (Age: ${datum ? datum.age : ''})
                Monthly PKV: ${datum.monthlyPKV}€
                Monthly GKV: ${datum.monthlyGKV}€`;
              }}
            />
            <Legend />
            <ReferenceLine x={child1LeaveYear} stroke="blue" label="Child1 Leaves" />
            <ReferenceLine x={child2LeaveYear} stroke="blue" label="Child2 Leaves" />
            <ReferenceLine x={gbzEndYear} stroke="purple" label="GBZ ends (61)" />
            <ReferenceLine x={startYear + (67 - currentAge)} stroke="purple" label="GBZ stabilization (67)" />
            <ReferenceLine x={viktorEndYear} stroke="red" label="Viktor Ends" />
            <ReferenceLine x={gannaEndYear} stroke="green" label="Ganna Ends" />
            <Line type="monotone" dataKey="PKV" stroke="#2196F3" name="Annual PKV Cost" />
            <Line type="monotone" dataKey="GKV" stroke="#4CAF50" name="Annual GKV Cost" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div className="overflow-x-auto mt-8 w-full">
        <table className="table-auto w-full text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-2">Year</th>
              <th className="px-4 py-2">Age</th>
              <th className="px-4 py-2 bg-blue-50">Monthly PKV</th>
              <th className="px-4 py-2 bg-green-50">Monthly GKV</th>
              <th className="px-4 py-2">Monthly GBZ</th>
              <th className="px-4 py-2">Total GBZ</th>
              <th className="px-4 py-2 bg-blue-50">Annual PKV</th>
              <th className="px-4 py-2 bg-green-50">Annual GKV</th>
              <th className="px-4 py-2">Viktor Base</th>
              <th className="px-4 py-2">Ganna Base</th>
              <th className="px-4 py-2 bg-blue-50">Child 1 (PKV)</th>
              <th className="px-4 py-2 bg-blue-50">Child 2 (PKV)</th>
              <th className="px-4 py-2">Deductible</th>
              <th className="px-4 py-2">Covered</th>
              <th className="px-4 py-2">Comments</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.year} className="border-b hover:bg-gray-50">
                <td className="px-4 py-2">{row.year}</td>
                <td className="px-4 py-2">{row.age}</td>
                <td className="px-4 py-2 bg-blue-50">{row.monthlyPKV.toLocaleString()}€</td>
                <td className="px-4 py-2 bg-green-50">{row.monthlyGKV.toLocaleString()}€</td>
                <td className="px-4 py-2">{row.monthlyGBZ.toLocaleString()}€</td>
                <td className="px-4 py-2">{row.cumulativeGBZ.toLocaleString()}€</td>
                <td className="px-4 py-2 bg-blue-50">{row.PKV.toLocaleString()}€</td>
                <td className="px-4 py-2 bg-green-50">{row.GKV.toLocaleString()}€</td>
                <td className="px-4 py-2">{row.viktorBasePremium.toLocaleString()}€</td>
                <td className="px-4 py-2">{row.gannaBasePremium.toLocaleString()}€</td>
                <td className="px-4 py-2 bg-blue-50">{row.child1Premium.toLocaleString()}€</td>
                <td className="px-4 py-2 bg-blue-50">{row.child2Premium.toLocaleString()}€</td>
                <td className="px-4 py-2">{row.deductible.toLocaleString()}€</td>
                <td className="px-4 py-2">{row.coveredMembers}</td>
                <td className="px-4 py-2">{row.comment}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InsuranceComparison;
