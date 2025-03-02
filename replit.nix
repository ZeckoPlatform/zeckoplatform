{pkgs}: {
  deps = [
    pkgs.prometheus
    pkgs.grafana
    pkgs.postgresql
  ];
}
