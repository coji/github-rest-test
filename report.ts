import fs from "fs";
import { cli } from "cleye";
import dayjs from "dayjs";
import { GitHubPullRequest, GitHubCommit, GitHubReviewComment } from "./model";
import { pipe, filter, sortBy, first } from "remeda";

const timestampOrNull = (str?: string | null) =>
  str ? dayjs(str).format("YYYY-MM-DD HH:mm") : null;

const commits = (number: number) => {
  return [
    JSON.parse(fs.readFileSync(`./json/${number}/commits.json`, "utf-8")),
  ];
};

/**
 * リリース日判定。TODO: タグから取得するのも必要
 * @param pulls
 * @param releaseBranch
 * @param targetHash
 * @returns
 */
const findReleaseDate = async (
  pulls: GitHubPullRequest[],
  releaseBranch: string,
  targetHash?: string
) => {
  const releasePulls = pulls.filter((pr) => pr.base.ref === releaseBranch);
  for (const pr of releasePulls) {
    if ((await commits(pr.number)).some((c: any) => c.id === targetHash)) {
      return pr.merged_at;
    }
  }
};

const codingTime = (
  first_commited_at: string | null,
  pr_created_at: string | null
) =>
  first_commited_at && pr_created_at
    ? Math.abs(dayjs(pr_created_at).diff(first_commited_at, "days", true))
    : null;

const pickupTime = (
  pr_created_at: string | null,
  first_review_commented_at: string | null
) =>
  pr_created_at && first_review_commented_at
    ? Math.abs(
        dayjs(first_review_commented_at).diff(pr_created_at, "days", true)
      )
    : null;

const reviewTime = (
  first_review_commented_at: string | null,
  merged_at: string | null
) =>
  merged_at && first_review_commented_at
    ? Math.abs(dayjs(merged_at).diff(first_review_commented_at, "days", true))
    : null;

const totalTime = ({
  first_committed_at,
  pr_created_at,
  first_review_commented_at,
  merged_at,
}: {
  first_committed_at: string | null;
  pr_created_at: string | null;
  first_review_commented_at: string | null;
  merged_at: string | null;
}) => {
  const firstTime = pipe(
    [first_committed_at, pr_created_at, first_review_commented_at],
    filter((x) => !!x),
    sortBy((x) => dayjs(x).unix()),
    first()
  );

  if (firstTime && merged_at)
    return dayjs(merged_at).diff(firstTime, "days", true);
  else return null;
};

const report = async (
  pulls: GitHubPullRequest[],
  releaseBranch: string,
  releaseCommits: { [key: string]: string }
) => {
  console.log(
    [
      "repo",
      "number",
      "target_branch",
      "state",
      "is_released",
      "author",
      "title",
      "html_url",
      "first_commited_at",
      "pr_created_at",
      "first_review_commented_at",
      "merged_at",
      "released_at",
      "coding time",
      "pickup time",
      "review time",
      "deploy time",
      "total time",
    ].join("\t")
  );

  for (const pr of pulls) {
    let firstCommit: GitHubCommit | null = null;
    try {
      firstCommit = JSON.parse(
        fs.readFileSync(`./json/${pr.number}/commits.json`, "utf-8")
      );
    } catch {}

    let firstReviewComment: GitHubReviewComment | null = null;
    try {
      firstReviewComment = JSON.parse(
        fs.readFileSync(`./json/${pr.number}/review-comments.json`, "utf-8")
      );
    } catch {}

    const first_committed_at = timestampOrNull(
      firstCommit?.commit.author?.date
    );
    const pr_created_at = timestampOrNull(pr.created_at);
    const first_review_commented_at = timestampOrNull(
      firstReviewComment?.created_at
    );
    const merged_at = timestampOrNull(pr.merged_at);

    const isReleased = !!(
      pr.merge_commit_sha &&
      Object.keys(releaseCommits).includes(pr.merge_commit_sha)
    );
    const released_at = null;
    // TODO: リリース日の判定。タグの履歴から取るケースと、特定ブランチへのマージがあった場合。
    /* timestampOrNull(
      pr.merge_commit_sha &&
        Object.keys(releaseCommits).includes(pr.merge_commit_sha)
        ? await findReleaseDate(pulls, releaseBranch, pr.merge_commit_sha)
        : null
    )
    */

    console.log(
      [
        pr.head.repo.name,
        pr.number,
        pr.base.ref,
        pr.state,
        isReleased,
        pr.user?.login,
        pr.title,
        pr.html_url,
        first_committed_at,
        pr_created_at,
        first_review_commented_at,
        merged_at,
        released_at,
        codingTime(first_committed_at, pr_created_at),
        pickupTime(first_review_commented_at, pr_created_at),
        reviewTime(merged_at, first_review_commented_at),
        null, // TODO: deploy time
        totalTime({
          first_committed_at,
          pr_created_at,
          first_review_commented_at,
          merged_at,
        }),
      ].join("\t")
    );
  }
};

const main = async ({
  filename,
  releaseBranch,
}: {
  filename: string;
  releaseBranch: string;
}) => {
  const pulls: GitHubPullRequest[] = JSON.parse(
    fs.readFileSync(filename, "utf-8")
  );

  let releaseCommits: { [key: string]: string } = {};
  try {
    releaseCommits = JSON.parse(
      fs.readFileSync(`./json/release-commits.json`, "utf-8")
    );
  } catch {}

  report(pulls, releaseBranch, releaseCommits);
};

const argv = cli({
  flags: {
    releaseBranch: {
      type: String,
    },
  },
});

main({
  filename: "./json/pulls.json",
  releaseBranch: argv.flags.releaseBranch ?? "release",
});
