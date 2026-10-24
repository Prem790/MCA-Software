const modules = [
  "identity",
  "firms",
  "companies",
  "compliance",
  "tasks",
  "documents",
  "audit",
  "reporting",
];

module.exports = {
  forbidden: [
    { name: "no-cycles", severity: "error", from: {}, to: { circular: true } },
    {
      name: "domain-is-independent",
      severity: "error",
      from: { path: "^src/modules/[^/]+/domain/" },
      to: {
        path: "(^src/(app|platform|features|components)/|/(infrastructure|presentation)/|node_modules/)",
      },
    },
    {
      name: "browser-ui-cannot-import-server-infrastructure",
      severity: "error",
      from: { path: "^src/(features|components)/" },
      to: { path: "^src/platform/(auth/server|database)/" },
    },
    ...modules.flatMap((owner) =>
      modules
        .filter((other) => other !== owner)
        .map((other) => ({
          name: `${owner}-uses-${other}-public-contracts`,
          severity: "error",
          from: { path: `^src/modules/${owner}/` },
          to: {
            path: `^src/modules/${other}/`,
            pathNot: `^src/modules/${other}/(index|schema|server)\\.ts$`,
          },
        })),
    ),
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: "tsconfig.json" },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      extensions: [".ts", ".tsx", ".js", ".json"],
      conditionNames: ["import", "node", "default"],
    },
    exclude: "\\.test\\.tsx?$",
  },
};
