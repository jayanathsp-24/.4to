export type TreeSpace = {
  spaceId: string;
  name: string;
  startDate: string;
  endDate: string;
  coverThumbUrl?: string | null;
  status: "active" | "closed" | "archived";
  memberCount: number;
  sharedPhotoCount: number;
  myContributionPending: boolean;
};

export type TreeBranch = {
  id: string;
  name: string;
  photoCount: number;
  branches: TreeBranch[];
  spaces: TreeSpace[];
};

export type TreeOverview = {
  user: { id: string; username: string; avatarUrl?: string | null };
  root: { id: string; name: string; photoCount: number; branches: TreeBranch[]; spaces: TreeSpace[] };
};

export type LayoutNode = { id: string; x: number; y: number; angle: number; length: number; width: number; path: string; depth: number };
export type LayoutLeaf = TreeSpace & { x: number; y: number; branchId: string };
export type TreeLayout = { nodes: LayoutNode[]; leaves: LayoutLeaf[]; width: number; height: number };

function hash(value: string): number {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) result = Math.imul(result ^ value.charCodeAt(index), 16777619);
  return (result >>> 0) / 4294967295;
}

function flatten(branches: TreeBranch[], depth = 1): Array<{ branch: TreeBranch; depth: number; parentX: number; parentY: number }> {
  return branches.flatMap((branch) => [{ branch, depth, parentX: 0, parentY: 0 }, ...flatten(branch.branches, depth + 1)]);
}

export function layoutTree(tree: TreeOverview): TreeLayout {
  const width = 900;
  const branchSpacing = 115;
  const branches = tree.root.branches;
  const height = Math.max(760, 220 + branches.length * branchSpacing);
  const cx = width / 2;
  const originY = height - 90;

  const nodes: LayoutNode[] = [];
  const leaves: LayoutLeaf[] = [];

  branches.forEach((branch, index) => {
    const branchY = originY - 100 - index * branchSpacing;
    const side = index % 2 === 0 ? -1 : 1;
    const targetX = cx + side * 240;
    const targetY = branchY - 12;

    const path = `M ${cx} ${branchY} C ${cx + side * 70} ${branchY}, ${targetX - side * 50} ${targetY + 8}, ${targetX} ${targetY}`;

    nodes.push({
      id: branch.id,
      x: targetX,
      y: targetY,
      angle: side > 0 ? 0 : Math.PI,
      length: 240,
      width: 5,
      path,
      depth: 1,
    });

    // Each branch represents exactly one PhotoSpace
    const space = branch.spaces[0];
    if (space) {
      leaves.push({
        ...space,
        branchId: branch.id,
        x: targetX,
        y: targetY,
      });
    }
  });

  return { nodes, leaves, width, height };
}

export function layoutSignature(tree: TreeOverview): string {
  return JSON.stringify(layoutTree(tree));
}
