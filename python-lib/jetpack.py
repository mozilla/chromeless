import os
import sys

import cuddlefish
from cuddlefish import packaging
from cuddlefish.bunch import Bunch

DEFAULT_RUNNER = "simple-jetpack-runner"

usage = """
%prog [options] [command]

Commands:
  xpi   - generate an xpi
  test  - run tests
  run   - run program
"""

def run(arguments=sys.argv[1:]):
    parser_options = {
        ("-r", "--runner",): dict(dest="runner",
                                  help=("package/module name of jetpack "
                                        "runner; default is %s" % 
                                        DEFAULT_RUNNER),
                                  metavar=None,
                                  default=DEFAULT_RUNNER)
        }

    parser_groups = Bunch(
        app=cuddlefish.parser_groups.app,
        tests=cuddlefish.parser_groups.tests
        );

    (options, args) = cuddlefish.parse_args(arguments=arguments,
                                            parser_options=parser_options,
                                            parser_groups=parser_groups,
                                            usage=usage)

    if args[0] != "run":
        print "'%s' is either unrecognized or not yet implemented." % (
            args[0]
            )
        sys.exit(1)

    jpdir = os.getcwd()

    manifest_json = os.path.join(jpdir, 'manifest.json')
    if not os.path.exists(manifest_json):
        print "manifest.json not found in the current directory."
        sys.exit(1)
    manifest = packaging.load_json_file(manifest_json)

    target_cfg = Bunch(
        name = manifest.name,
        root_dir = "",
        data = jpdir,
        main = options.runner,
        keywords = ["contains-a-jetpack"],
        dependencies = [options.runner]
        )

    pkg_cfg = packaging.build_config(os.environ['CUDDLEFISH_ROOT'],
                                     target_cfg)

    for name in manifest.capabilities:
        module_name = "jetpack-cap-factory-%s" % name
        pkgs = packaging.find_packages_with_module(pkg_cfg, module_name)
        if not pkgs:
            print "a package for the capability '%s' was not found." % name
            sys.exit(1)
        if len(pkgs) > 1:
            print ("multiple packages were found for the capability "
                   "'%s': %s" % (name, ", ".join(pkgs)))
            sys.exit(1)
        pkg_name = pkgs[0]
        if pkg_name not in target_cfg.dependencies:
            target_cfg.dependencies.append(pkg_name)

    cuddlefish.run(arguments=["run"],
                   target_cfg=target_cfg,
                   pkg_cfg=pkg_cfg,
                   defaults=options.__dict__)
