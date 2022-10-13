import dotenv from "dotenv";
dotenv.config();
import invariant from "tiny-invariant";
import { cli } from "cleye";
import { createFetcher } from "./fetcher";
import fs from "fs/promises";

const main = async ({
  owner,
  repo,
  number,
}: {
  owner: string;
  repo: string;
  number: number;
}) => {
  const fetcher = createFetcher({ owner, repo, debug: true });
  const commits = await fetcher.commits(number);
};

const argv = cli({
  flags: {
    owner: {
      type: String,
    },
    repo: {
      type: String,
    },
    number: {
      type: Number,
    },
  },
});

invariant(argv.flags.owner, "owner not specified");
invariant(argv.flags.repo, "repo not specified");
invariant(argv.flags.number, "number not specified");

main({
  owner: argv.flags.owner,
  repo: argv.flags.repo,
  number: argv.flags.number,
});
