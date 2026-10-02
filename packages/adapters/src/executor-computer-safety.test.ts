import { describe, expect, it } from "vitest";
import {
  desktopProtectionGuardMessage,
  isProtectedComputerLifecycleCommand,
  protectedComputerLifecycleRefusal,
} from "./executor.js";

describe("computer lifecycle command guard", () => {
  it("rejects commands that can destroy a graphical bot's desktop", () => {
    for (const command of [
      "pkill chromium",
      "killall chrome",
      "kill -9 1234",
      "k\\ill -9 1234",
      "xkill",
      "systemctl restart chromium",
      "systemctl --user restart chromium",
      "service chromium restart",
      "rm -rf ~/.browser-profiles/chromium",
      'rm -rf "$HOME/.browser-profiles/chromium"',
      "rm -f /tmp/.X1-lock",
      "bash -c 'pkill chromium'",
      'bash -lc "killall chrome"',
      "bash -o posix -c 'pkill chromium'",
      "bash --rcfile /tmp/bashrc -c 'pkill chromium'",
      "sh -c 'systemctl restart chromium'",
      `bash -c 'eval "pkill chromium"'`,
      'bash -lc "source /tmp/kill-chrome.sh"',
      "printf 'pkill chromium\\n' > /tmp/x; . /tmp/x",
      "bash -c `pkill chromium`",
      'bash <<< "pkill chromium"',
      "$KILLER chromium",
      'rm -rf "$TARGET/.browser-profiles/chromium"',
    ]) {
      expect(isProtectedComputerLifecycleCommand(command)).toBe(true);
    }
  });

  it("keeps ordinary shell work available", () => {
    expect(isProtectedComputerLifecycleCommand("pwd && ls -la")).toBe(false);
    expect(isProtectedComputerLifecycleCommand("node scripts/check.js")).toBe(false);
    expect(isProtectedComputerLifecycleCommand("systemctl status chromium")).toBe(false);
    expect(isProtectedComputerLifecycleCommand('rm -f "$WORKSPACE/tmp.txt"')).toBe(false);
    expect(isProtectedComputerLifecycleCommand("printf '%s\\n' *.txt && pwd")).toBe(false);
  });

  it.each([
    "find . -maxdepth 2 -type d -name .git -print",
    "git -C . status --short",
    "git add .",
    "git add then .",
    "ls . && git -C . worktree list --porcelain",
    "set -eu\npwd\nfind . -maxdepth 2 -type d -name .git -print",
    "git worktree add ../review-worktree origin/main",
    "find /tmp/. -maxdepth 1 -type d",
    "git diff -- .",
    "printf '%s' 'pk\\\nill chromium'",
    "printf '%s' 'pk\\\nill' chromium",
    "printf '%s' 'line one\nline two'",
  ])("allows repository paths without treating dot arguments as sourcing: %s", (command) => {
    expect(isProtectedComputerLifecycleCommand(command)).toBe(false);
  });

  it.each([
    ". /tmp/script.sh",
    "pwd; . /tmp/script.sh",
    "pwd\n. /tmp/script.sh",
    "find . -maxdepth 1 && . /tmp/script.sh",
    "command . /tmp/script.sh",
    "builtin . /tmp/script.sh",
    "command -p . /tmp/script.sh",
    "true && > /tmp/output . /tmp/script.sh",
    "2> /tmp/output . /tmp/script.sh",
    "if true; then . /tmp/script.sh; fi",
    "bash -c 'pwd\n. /tmp/script.sh'",
    "pk\\\nill chromium",
    "! . /tmp/script.sh",
    "if false; then :; elif . /tmp/script.sh; then :; fi",
    "{ . /tmp/script.sh; }",
    "coproc . /tmp/script.sh",
    "coproc worker . /tmp/script.sh",
    "function f { . /tmp/script.sh; }",
    "function f { . /tmp/script.sh; }; f",
  ])("continues blocking executable sourcing and lifecycle operations: %s", (command) => {
    expect(isProtectedComputerLifecycleCommand(command)).toBe(true);
  });

  it("names the trigger that the desktop-protection guard refused", () => {
    expect(protectedComputerLifecycleRefusal("pkill chromium")).toBe("protected command pkill");
    expect(protectedComputerLifecycleRefusal("kill -9 1234")).toBe("protected command kill");
    expect(protectedComputerLifecycleRefusal("systemctl restart chromium")).toBe(
      "systemctl restart",
    );
    expect(protectedComputerLifecycleRefusal("service chromium restart")).toBe("service restart");
    expect(protectedComputerLifecycleRefusal("rm -rf ~/.browser-profiles/chromium")).toBe(
      "browser profile path",
    );
    expect(protectedComputerLifecycleRefusal("rm -f /tmp/.X1-lock")).toBe("X11 path");
    expect(protectedComputerLifecycleRefusal('rm -rf "$TARGET/.browser-profiles/chromium"')).toBe(
      "unresolved variable $TARGET",
    );
    expect(protectedComputerLifecycleRefusal('for f in *.log; do wc -l "$f"; done')).toBe(
      "unresolved variable $f",
    );
    expect(protectedComputerLifecycleRefusal('echo "built at $(date)"')).toBe(
      "command substitution",
    );
    expect(protectedComputerLifecycleRefusal("echo `date`")).toBe("backtick");
    expect(protectedComputerLifecycleRefusal("( cd app && npm test )")).toBe("subshell");
    expect(protectedComputerLifecycleRefusal("python <<'EOF'\nprint(1)\nEOF")).toBe("heredoc");
    expect(protectedComputerLifecycleRefusal("source /tmp/kill-chrome.sh")).toBe("source");
    expect(protectedComputerLifecycleRefusal("eval 'ls'")).toBe("eval");
    expect(protectedComputerLifecycleRefusal('bash <<< "pkill chromium"')).toBe("herestring");
    expect(desktopProtectionGuardMessage("unresolved variable $f")).toBe(
      "This command was not run: desktop-protection guard: unresolved variable $f. Shell access is still available. Do not stop or restart browser or desktop processes.",
    );
  });

  it("allows comments, literal assignments, activate scripts, and quoted heredoc data", () => {
    for (const command of [
      "ls ~/workspace # check output",
      "echo foo # not a command\npwd",
      "echo foo#bar\npwd",
      'dir=/home/rakazo/workspace/app; ls "$dir"',
      'dir=/home/rakazo/workspace/app && ls "$dir"',
      "dir='/tmp/My Dir'; ls \"$dir\"",
      "source venv/bin/activate",
      "source venv/bin/activate && pytest",
      ". ./bin/activate",
      "command source venv/bin/activate",
      "cat > notes.md <<'EOF'\nhello\nEOF",
      "cat > notes.md <<'EOF'\npkill chromium\n$(date)\nEOF\necho after",
      'tee notes.md <<"EOF"\n# heading\nEOF',
      "cat <<'EOF' | tee notes.md\nhello\nEOF",
      "echo 'built at $(date)'",
      "ls # $(pkill chromium)",
      "bash -c 'source venv/bin/activate'",
      "source 'venv/bin/activate'",
    ]) {
      expect(protectedComputerLifecycleRefusal(command), command).toBeUndefined();
    }
  });

  it("keeps computed variables, variable source paths, and interpreter heredocs closed", () => {
    expect(protectedComputerLifecycleRefusal('dir=/tmp/$USER; ls "$dir"')).toBe(
      "unresolved variable $dir",
    );
    expect(protectedComputerLifecycleRefusal('dir=$(pwd); ls "$dir"')).toBe("command substitution");
    expect(protectedComputerLifecycleRefusal('dir=/tmp; other="$dir"; ls "$other"')).toBe(
      "unresolved variable $other",
    );
    expect(protectedComputerLifecycleRefusal('dir=/tmp ls "$dir"')).toBe(
      "unresolved variable $dir",
    );
    expect(
      protectedComputerLifecycleRefusal('dir=/tmp/.browser-profiles; rm -rf "$dir/chromium"'),
    ).toBe("browser profile path");
    expect(protectedComputerLifecycleRefusal('dir=venv/bin/activate; source "$dir"')).toBe(
      "source",
    );
    expect(protectedComputerLifecycleRefusal('source "$VENV/bin/activate"')).toBe("source");
    expect(protectedComputerLifecycleRefusal("source venv/bin/activate.fish")).toBe("source");
    expect(protectedComputerLifecycleRefusal("bash <<'EOF'\npwd\nEOF")).toBe("heredoc");
    expect(protectedComputerLifecycleRefusal("sh <<'EOF'\npwd\nEOF")).toBe("heredoc");
    expect(protectedComputerLifecycleRefusal("cat <<'EOF' | bash\npwd\nEOF")).toBe("heredoc");
    expect(protectedComputerLifecycleRefusal("cat <<'EOF' | python3\nprint(1)\nEOF")).toBe(
      "heredoc",
    );
    expect(protectedComputerLifecycleRefusal("node <<'EOF'\nconsole.log(1)\nEOF")).toBe("heredoc");
    expect(protectedComputerLifecycleRefusal("cat <<EOF\n$(pkill chromium)\nEOF")).toBe(
      "command substitution",
    );
    expect(protectedComputerLifecycleRefusal("echo ok # comment\npkill chromium")).toBe(
      "protected command pkill",
    );
    expect(protectedComputerLifecycleRefusal("echo foo#bar\npkill chromium")).toBe(
      "protected command pkill",
    );
    expect(protectedComputerLifecycleRefusal("dir=pkill; $dir chromium")).toBe(
      "protected command pkill",
    );
    expect(protectedComputerLifecycleRefusal("dir='pkill chromium'; $dir")).toBe(
      "protected command pkill",
    );
    expect(protectedComputerLifecycleRefusal("dir='pkill chromium'; bash -c \"$dir\"")).toBe(
      "protected command pkill",
    );
    expect(protectedComputerLifecycleRefusal("dir='rm -rf ~/.browser-profiles'; $dir")).toBe(
      "browser profile path",
    );
    expect(protectedComputerLifecycleRefusal("ls # $(pkill)\npkill chromium")).toBe(
      "protected command pkill",
    );
    expect(protectedComputerLifecycleRefusal("bash -c 'source /tmp/x'")).toBe("source");
  });
});
