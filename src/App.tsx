import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

const InsuranceComparison = () => {
  // Define key dates and assumptions
  const startYear = 2024;
  const currentAge = 41;
  const viktorLifeExpectancy = 81;
  const gannaLifeExpectancy = 88;

  // Children current ages and leave years
  const child1CurrentAge = 19;
  const child2CurrentAge = 16;
  const child1LeaveYear = startYear + (25 - child1CurrentAge); // 2024 + 6 = 2030
  const child2LeaveYear = startYear + (25 - child2CurrentAge); // 2024 + 9 = 2033

  // GBZ ends at age 61 (when you turn 61, no more GBZ)
  const gbzEndYear = startYear + (60 - currentAge); // age 60 ends, age 61 is first no-GBZ year
  const viktorEndYear = startYear + (viktorLifeExpectancy - currentAge);
  const gannaEndYear = startYear + (gannaLifeExpectancy - currentAge);

  const calculateProjection = () => {
    const data = [];

    // Initial adult premium at age 41 (no Kurkosten, includes GBZ):
    // Given: Adult total at 41 = 748.40€ with GBZ
    // Base premium = 748.40 / 1.1 ≈ 680.36€
    const initialBasePremium = 680.36;

    // Child premium (no GBZ): 223.75€
    const childPremium = 223.75; 

    // GKV initial: 2200€
    const gkvBase = 2200.00; 

    // Growth rates:
    // Adults: 3% until age 60 (with GBZ), then 2% after age 60 (no GBZ)
    const adultIncreaseBefore61 = 0.03;
    const adultIncreaseAfter60 = 0.02;
    // Children: always 3%
    const childIncrease = 0.03;
    // GKV: always 3%
    const gkvIncrease = 0.03;

    // Deductible:
    const deductiblePerPerson = 800;

    // Calculate until Ganna's end (age 88)
    const totalYears = gannaLifeExpectancy - currentAge;

    for (let i = 0; i <= totalYears; i++) {
      const year = startYear + i;
      const age = currentAge + i;

      // Coverage flags
      const viktorCovered = age <= viktorLifeExpectancy;
      const gannaCovered = age <= gannaLifeExpectancy;
      const child1Covered = year < child1LeaveYear; 
      const child2Covered = year < child2LeaveYear;

      // Calculate adult base premium for this age
      let currentBasePremium;
      if (age > 60) {
        // Split into two phases:
        const yearsToSixty = 60 - 41; // 19 years at 3%
        const premiumAt60 = initialBasePremium * Math.pow(1 + adultIncreaseBefore61, yearsToSixty);

        const yearsAfterSixty = age - 60;
        currentBasePremium = premiumAt60 * Math.pow(1 + adultIncreaseAfter60, yearsAfterSixty);
      } else {
        // age <= 60
        const yearsFrom41 = age - 41;
        currentBasePremium = initialBasePremium * Math.pow(1 + adultIncreaseBefore61, yearsFrom41);
      }

      // Adult premiums (Viktor & Ganna)
      let currentViktorPKV = 0;
      if (viktorCovered) {
        currentViktorPKV = (age <= 60) ? currentBasePremium * 1.1 : currentBasePremium;
      }

      let currentGannaPKV = 0;
      if (gannaCovered) {
        currentGannaPKV = (age <= 60) ? currentBasePremium * 1.1 : currentBasePremium;
      }

      // Children premiums
      const childMultiplier = Math.pow(1 + childIncrease, i);
      const currentChild1PKV = child1Covered ? childPremium * childMultiplier : 0;
      const currentChild2PKV = child2Covered ? childPremium * childMultiplier : 0;

      // GKV (no special changes)
      const gkvMultiplier = Math.pow(1 + gkvIncrease, i);
      const currentGKV = gkvBase * gkvMultiplier;

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

      // Calculate GBZ amount (only if age <= 60)
      let monthlyGBZ = 0;
      if (age <= 60) {
        // GBZ is 10% of adults' premiums (Viktor+Ganna), not counting children or deductible
        const adultsPKV = currentViktorPKV + currentGannaPKV;
        monthlyGBZ = adultsPKV > 0 ? adultsPKV * (10/110) : 0; 
        // Alternatively: monthlyGBZ = (adultsPKV/1.1)*0.1, but since we had base *1.1, 10% of total is simpler:
        // Actually simpler: GBZ is precisely (adultsPKV * (10/110)) or just (adultsPKV - adultsPKV/1.1)
        // but since adultsPKV includes the 10%, monthlyGBZ = adultsPKV - (adultsPKV/1.1)
        // Let's keep monthlyGBZ = (adultsPKV * 0.1/1.1) is correct? 
        // Actually, we know adultsPKV includes GBZ already if <= 60.
        // If adultsPKV = base*1.1, base + 10% of base, 10% of that total is not correct for GBZ:
        // Base *1.1 = base + 10% of base. The 10% of base is the GBZ.
        // So GBZ = adultsPKV - baseAdults
        // baseAdults = currentBasePremium (if covered)
        // Let's do a simpler approach:
        // If age <= 60:
        // Viktor: if covered: base*1.1. base is currentBasePremium. So GBZ = base*0.1 per adult.
        // For each covered adult: GBZ per adult = currentBasePremium *0.1
        let adultsCount = 0;
        if (viktorCovered) adultsCount++;
        if (gannaCovered) adultsCount++;
        monthlyGBZ = currentBasePremium * 0.1 * adultsCount;
      }

      // Get previous cumulative totals
      const prev = data[data.length - 1] || { 
        cumulativePKV: 0, 
        cumulativeGKV: 0,
        cumulativeGBZ: 0 
      };

      // Cumulative totals
      const cumulativePKV = prev.cumulativePKV + annualPKV;
      const cumulativeGKV = prev.cumulativeGKV + annualGKV;
      const cumulativeGBZ = prev.cumulativeGBZ + Math.round(monthlyGBZ * 12);

      // Generate comment if hitting a key event
      let comment = '';
      if (year === child1LeaveYear) comment = 'Child 1 leaves';
      if (year === child2LeaveYear) comment = 'Child 2 leaves';
      if (year === gbzEndYear) comment = 'GBZ ends (age 61)';
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
    <div className="w-full max-w-4xl p-4">
      <div className="mb-4">
        <h2 className="text-lg font-bold">PKV vs GKV Cost Comparison (Simplified GBZ Model)</h2>
        <p className="text-sm text-gray-600 mb-2">
          Before age 61: Adults 3% growth +10% GBZ<br/>
          After 60: Adults 2% growth, no GBZ<br/>
          Children: 3% growth, leave at 25<br/>
          GKV: 3% growth, no changes
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
      <div className="h-96">
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
            <ReferenceLine x={gbzEndYear} stroke="purple" label="GBZ Ends" />
            <ReferenceLine x={viktorEndYear} stroke="red" label="Viktor Ends" />
            <ReferenceLine x={gannaEndYear} stroke="green" label="Ganna Ends" />
            <Line type="monotone" dataKey="PKV" stroke="#2196F3" name="Annual PKV Cost" />
            <Line type="monotone" dataKey="GKV" stroke="#4CAF50" name="Annual GKV Cost" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* Data table */}
      <div className="overflow-x-auto mt-8">
        <table className="table-auto w-full text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-2">Year</th>
              <th className="px-4 py-2">Age</th>
              <th className="px-4 py-2">Monthly PKV</th>
              <th className="px-4 py-2">Monthly GKV</th>
              <th className="px-4 py-2">Monthly GBZ</th>
              <th className="px-4 py-2">Total GBZ</th>
              <th className="px-4 py-2">Annual PKV</th>
              <th className="px-4 py-2">Annual GKV</th>
              <th className="px-4 py-2">Viktor Base</th>
              <th className="px-4 py-2">Ganna Base</th>
              <th className="px-4 py-2">Child 1</th>
              <th className="px-4 py-2">Child 2</th>
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
                <td className="px-4 py-2">{row.monthlyPKV.toLocaleString()}€</td>
                <td className="px-4 py-2">{row.monthlyGKV.toLocaleString()}€</td>
                <td className="px-4 py-2">{row.monthlyGBZ.toLocaleString()}€</td>
                <td className="px-4 py-2">{row.cumulativeGBZ.toLocaleString()}€</td>
                <td className="px-4 py-2">{row.PKV.toLocaleString()}€</td>
                <td className="px-4 py-2">{row.GKV.toLocaleString()}€</td>
                <td className="px-4 py-2">{row.viktorBasePremium.toLocaleString()}€</td>
                <td className="px-4 py-2">{row.gannaBasePremium.toLocaleString()}€</td>
                <td className="px-4 py-2">{row.child1Premium.toLocaleString()}€</td>
                <td className="px-4 py-2">{row.child2Premium.toLocaleString()}€</td>
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
