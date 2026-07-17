import { OPERATIONS } from "../data/catalogs.js";

export class CatalogService {
  accounts() {
    return Object.keys(OPERATIONS);
  }

  number(account) {
    return OPERATIONS[account]?.number || "";
  }

  works(account) {
    const results = [];

    Object.entries(OPERATIONS[account]?.activities || {})
      .forEach(([subactivity, works]) => {
        works.forEach(work => {
          results.push(`${subactivity} | ${work}`);
        });
      });

    return results;
  }

  allWorks() {
    return [...new Set(
      Object.values(OPERATIONS)
        .flatMap(account =>
          Object.values(account.activities).flat()
        )
    )].sort((a, b) => a.localeCompare(b, "es"));
  }

  parse(value) {
    const parts = value.split(" | ");

    return {
      subactivity: parts[0] || "",
      work: parts.slice(1).join(" | ") || value
    };
  }

  findWork(workName) {
    for (const [account, accountData] of Object.entries(OPERATIONS)) {
      for (const [subactivity, works] of Object.entries(accountData.activities)) {
        if (works.includes(workName)) {
          return {
            activity: account,
            activityCode: accountData.number,
            subactivity,
            work: workName
          };
        }
      }
    }

    return {
      activity: "",
      activityCode: "",
      subactivity: "",
      work: workName
    };
  }
}
