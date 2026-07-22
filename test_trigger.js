async function run() {
  const url = "https://api.github.com/repos/estevaodutra/qualify/actions/runs";
  console.log("Fetching GitHub action runs...");
  try {
    const res = await fetch(url);
    const json = await res.json();
    const runs = json.workflow_runs || [];
    console.log(`Found ${runs.length} runs:`);
    for (const run of runs.slice(0, 5)) {
      console.log(`- Commit: ${run.head_commit?.message} | Status: ${run.status} | Conclusion: ${run.conclusion} | URL: ${run.html_url}`);
    }
  } catch (err) {
    console.error("Error fetching runs:", err);
  }
}
run();
