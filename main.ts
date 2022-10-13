import dotenv from "dotenv";
dotenv.config();
import invariant from "tiny-invariant";
import { cli } from "cleye";
import { createFetcher } from "./fetcher";

const main = async ({ owner, repo }: { owner: string; repo: string }) => {
  const fetcher = createFetcher({ owner, repo });
  console.log("pulls...");
  const pulls = await fetcher.pulls();
  for (const pr of pulls) {
    console.log("firstCommit of ", pr.number);
    await fetcher.commits(pr.number);
    console.log("commits of ", pr.number);
    await fetcher.firstReviewComment(pr.number);
    console.log("reviews of", pr.number);
    await fetcher.reviews(pr.number);
  }
};

const argv = cli({
  flags: {
    owner: {
      type: String,
    },
    repo: {
      type: String,
    },
  },
});

invariant(argv.flags.owner, "owner not specified");
invariant(argv.flags.repo, "repo not specified");

main({
  owner: argv.flags.owner,
  repo: argv.flags.repo,
});
