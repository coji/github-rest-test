import dotenv from "dotenv";
dotenv.config();
import invariant from "tiny-invariant";
import { cli } from "cleye";
import { createFetcher } from "./fetcher";
import fs from "fs/promises";

const main = async ({ owner, repo }: { owner: string; repo: string }) => {
  const fetcher = createFetcher({ owner, repo, debug: true });
  const pulls = await fetcher.pulls();
  await fs.writeFile(repo, JSON.stringify(pulls));
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
